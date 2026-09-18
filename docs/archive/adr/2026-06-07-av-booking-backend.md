# Alta Vibración — booking backend & data (Phase 1)

**Date:** 2026-06-07
**Status:** Decided
**Spike:** [oscar-ospina/saas-planner#33](https://github.com/oscar-ospina/saas-planner/issues/33)
**Parent epic:** [oscar-ospina/saas-planner#31](https://github.com/oscar-ospina/saas-planner/issues/31)
**Pairs with:** [Google Calendar integration ADR](2026-06-07-av-google-calendar.md) ([#32](https://github.com/oscar-ospina/saas-planner/issues/32))

## Decision

**No database for Phase 1.** Google Calendar is the single source of truth. The backend lives **inside `alta-vibracion-web`** (Next.js Route Handlers / Server Actions on Vercel) — **no `api/` sibling repo yet**.

- **Read availability:** a **Server Component** server‑side fetch for the initial render, or a **GET Route Handler** (`app/api/availability/route.ts`) if the client must re‑fetch slots interactively (e.g. changing the date without navigation). Compute open slots from Liliana's events (per [#32](2026-06-07-av-google-calendar.md)). **Not** a Server Action — those are POST‑only and serialized, wrong for reads.
- **Confirm a booking (mutation):** a **Server Action** (`'use server'`) invoked from the booking form in a Client Component — idiomatic for a UI‑triggered mutation, built‑in pending state, POST under the hood. Treat it as a **public POST endpoint**: validate input and **re‑check the slot inside the action** before inserting (Server Actions are reachable by direct POST, not only via the UI). (If a future mobile app / external caller appears — the deferred `api/` repo — additionally expose it as a POST Route Handler.)
- **Runtime:** **Node.js** (`export const runtime = "nodejs"`). It's already the App Router default; pin it as belt‑and‑suspenders because `googleapis` is not Edge‑compatible.
- **Timeout:** default is ample — with Fluid Compute (default) Hobby's `maxDuration` is 300 s and a Calendar call is sub‑second. Optionally cap the booking function (`export const maxDuration = 10`) as a guard against a hung Google call.
- **Secrets:** the service‑account key as a base64 server‑side env var (see [#32](2026-06-07-av-google-calendar.md)); never `NEXT_PUBLIC_`.

**Double‑booking** is handled in three tiers — **ship only the floor**:

1. **Floor (Phase 1, solo practitioner, rare contention):** GCal‑only.
   - Pre‑check the slot (read busy via `events.list`) — primarily a UX fast‑fail that also catches slots **Liliana booked manually**.
   - `events.insert` with a **deterministic, slot‑derived event id** — base32hex of `calendarId | slotStartUTC` (5–1024 chars, `a–v` + `0–9`). Google enforces **per‑calendar id uniqueness**: a duplicate id returns **HTTP 409 `duplicate`**. This gives **idempotency for free** (client double‑clicks / retries collapse to the same id) at zero infra cost.
   - Store booking metadata in the event's **`extendedProperties.private`** (client name, idempotency key, channel); Google's created/updated timestamps are the audit trail. **No store needed.**
2. **Escalation when volume grows (genuine concurrent contention):** an **Upstash Redis** `SET <key> NX EX <ttl>` lock keyed on `(calendarId, slotStartUTC)`, TTL ~10–30 s, held across read‑check + insert. **A lock store, not a database.** (Vercel KV was discontinued Dec 2024 → Upstash Redis via the Vercel Marketplace; HTTP/REST, serverless‑fit, free tier ample.)
3. **Real scale / multi‑practitioner / reporting:** a durable **Neon Postgres** (Vercel Marketplace; the maintained successor to Vercel Postgres) **`UNIQUE (calendar_id, slot_start)`** ledger + richer audit. Use the **pooled** connection string on serverless.

**Rejected mechanisms:** tentative **hold‑then‑confirm** (its value is reserving a slot during a *checkout* window — Phase 1 is booking‑only, nothing to hold for — and it still races on insert); **compensating insert‑then‑recheck‑then‑delete** (extra round‑trip, needs a deterministic tiebreaker or concurrent requests delete each other's events — strictly worse than a Redis lock once you'd pay for a store).

## Context

Phase 1 is **booking‑only**: no payment, no checkout window, one calendar owner, low volume. The temptation is to stand up a DB "to be safe"; the research shows that for this load GCal + Google's own per‑calendar id uniqueness covers the realistic failure modes (duplicate submissions; Liliana's manual bookings) with **zero** extra infrastructure, and a DB would add serverless connection‑pool and cold‑start costs for no Phase‑1 benefit. The genuine‑concurrency gap is real but **volume‑driven**, so it's named as the next tier rather than pre‑built.

> ⚠️ Like [#32](2026-06-07-av-google-calendar.md), this is **design‑validated against official docs, not live‑run.** The id‑collision/409 behavior and the runtime should be smoke‑tested with real credentials as the first implementation task.

## Rationale

- **`events.insert` is not atomic on availability** and Calendar has no transactional conflict prevention — check‑then‑insert is inherently a race. But Google **does** enforce event‑id uniqueness per calendar (`409 duplicate`), a free compare‑and‑swap most "you need a DB" advice overlooks.
- **Deterministic slot‑id = best‑effort *idempotency*, NOT a concurrency lock.** Google explicitly warns id‑collision detection "cannot be guaranteed … at event creation time" (globally distributed system / replication lag). So two **truly simultaneous** inserts of the same id can both succeed before reconciliation. It reliably collapses **serial** duplicates (the common case: double‑clicks, retries); it only *probabilistically* helps the rare two‑different‑clients‑same‑slot race. That residual race is exactly what the **Redis `SET NX EX`** tier closes — and why the escalation is a lock store, not a DB.
- **Server Action for the mutation, Server Component / GET handler for reads** follows official Next.js guidance: Server Actions are POST‑only, dispatched one at a time — right for a UI mutation, wrong for fetching. Reads belong in a Server Component fetch or a cacheable GET Route Handler.
- **Node runtime + default timeout** need essentially no configuration: App Router defaults to Node, and current Vercel Fluid‑Compute durations (Hobby 300 s) dwarf a sub‑second Google call. (Older blog posts citing 10 s Hobby limits predate Fluid Compute — trust the current Vercel docs.)

## Risks & caveats

- **Deterministic id is load‑bearing — make it a hard rule.** If the code ever generates random/UUID ids per booking, two different clients both pass the pre‑check and both insert (different ids → no 409) → **double‑book**. The id MUST be derived from `(calendarId, slotStartUTC)`. Normalize the slot start to **UTC** (America/Bogotá is UTC‑5, no DST → unambiguous) so ids are stable.
- **Best‑effort, not guaranteed** — the 409 path is documented as not guaranteed at creation time. Acceptable at solo‑practice volume; the Redis lock is the correct first add when real concurrency appears, **before** reaching for a DB.
- **Delete‑then‑rebook edge** — if Liliana **cancels** a booking (deletes the event) and a different client rebooks the **same slot**, the deterministic id may collide with the **deleted** event's id and return a `409` on a now‑*free* slot (id reuse after delete is undocumented). Workaround: **salt** the id with a booking nonce stored in `extendedProperties`, or **query the slot first** and treat 409 + slot‑actually‑free as "regenerate id". Verify the deleted‑id behavior in the implementation smoke‑test.
- **Server Action is a public POST** — Next.js explicitly warns these are reachable by direct POST; validate and re‑check availability inside the action, don't trust the UI.
- **Rate limits** — `403 userRateLimitExceeded` / `429`; add exponential backoff in the booking handler even though solo volume stays far under quota.
- **If/when a store is added:** Redis lock TTL must expire (a crashed handler must not leave a permanent lock); Postgres on serverless requires the **pooled** connection + no prepared statements.

## Consequences

- Phase 1 ships with **no database, no lock store, no `api/` repo** — booking is a Server Action + the Calendar client from [#32](2026-06-07-av-google-calendar.md).
- The double‑book posture is **honest and bounded**: idempotent against the common failure, tolerant of the rare race at current volume, with a **named, cheap escalation** (Redis lock) that does not require adopting a DB.
- Adding *Pago* (Phase 2) is what would introduce a real checkout window (reviving the hold pattern) and likely the first durable store — out of scope here.

## References

- `events.insert` (client‑specified id; no conflict prevention): https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Calendar API errors (`409 duplicate`, rate limits, ETag/If‑Match): https://developers.google.com/workspace/calendar/api/guides/errors
- Next.js Server Actions / mutating data (POST‑only; validate inside): https://nextjs.org/docs/app/getting-started/mutating-data
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js route segment config (`runtime`): https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
- Vercel function limits (Fluid Compute durations): https://vercel.com/docs/functions/limitations
- Vercel KV → Upstash migration: https://vercel.com/docs/storage/vercel-kv
- Upstash Redis (SET NX EX, pricing): https://upstash.com/docs/redis/overall/pricing
- Neon on Vercel (Postgres successor): https://vercel.com/marketplace/neon
