# Decision log — Alta Vibración web

One entry per significant decision. Status: **DECIDED**, **OPEN** (needs a call),
**DEFERRED** (consciously later). Newest at the bottom; never delete entries —
supersede them. Long-form rationale lives in `docs/adr/`; this file is the index.

Planning history: until 2026-09-15 stories and ADRs lived in the `saas-planner`
repo (GitHub Issues/Projects). That repo is **retired**. Its ADRs are archived in
`docs/adr/`; its issue numbers survive in old commit messages and code comments
(`saas-planner#N`) and are mapped at the bottom of this file. New work is tracked
in this repo's own GitHub issues.

---

## W1 — App framework · DECIDED (2026-06-06)

**Next.js (App Router) + TypeScript, static-by-default**, consuming `@saas/ui`.
Rejected Vite + React Router SPA (no prerendered HTML for an SEO-critical landing).
Wiring: `@import "@saas/ui/theme.css"` + `@source "../node_modules/@saas/ui"` in
`app/globals.css`; fonts via `next/font` as `--font-archivo` / `--font-open-sans`.
→ [ADR](adr/2026-06-06-av-app-framework.md)

## W2 — Brand layer over `@saas/ui` · DECIDED (2026-06-06)

`@saas/ui` stays brand-agnostic; Alta Vibración is its reference brand, not baked
in. Brand specifics (logo SVGs, copy, imagery, brand compositions) live in this
repo. No DS change required. Light-only.
→ [ADR](adr/2026-06-06-av-brand-layer.md)

## W3 — Availability source · DECIDED (2026-06-07), integration DEFERRED

**Google Calendar is the source of truth** for Liliana's availability (she keeps
using the tool she knows). Auth = Google Cloud service account; Liliana shares her
personal calendar with it via `Acl.insert` (`writer`). No OAuth, no domain-wide
delegation. Read availability with `events.list`, write time-block events with no
attendees, deterministic slot-derived event ids as a best-effort double-book guard.
Scope `calendar.events`; target `calendarId` = Liliana's gmail, never `"primary"`;
times in America/Bogotá (UTC-5, no DST), slot starts normalized to UTC.
The server client (`lib/calendar.ts`), runbook (`docs/booking-setup.md`) and
`npm run smoke:calendar` are merged, but the **live smoke-test is still pending**
owner-provisioned credentials. Green CI does not verify the integration.
→ [ADR](adr/2026-06-07-av-google-calendar.md)

## W4 — Booking backend & data (Phase 1) · DECIDED (2026-06-07), DEFERRED with W3

**No database in Phase 1.** Booking is a Server Action (`runtime = "nodejs"`,
validates and re-checks availability inside). Google's `409 duplicate` on the
deterministic event id is idempotency, not a lock; add an Upstash Redis `SET NX EX`
lock only if real concurrency appears. Event id = `base32hex(calendarId|slotStartUTC)`;
handle the delete-then-rebook id-reuse edge (salt the id or query first).
Client confirmation = screen + `.ics`.
→ [ADR](adr/2026-06-07-av-booking-backend.md)

## W5 — Agenda local MVP pivot · DECIDED (owner, 2026-06-10)

Ship `/agenda` **without a backend**: availability simulated client-side (1–3
random slots per viewed date marked "Reservado", persisted in `localStorage`
`av-agenda-v1`), the visitor's own booking persisted too, confirmation hands the
details to **WhatsApp**; Liliana syncs her real calendar by hand. W3/W4 stay
decided and resume when the live calendar setup exists. Remaining real-integration
order: live smoke-test → availability/slots → booking Server Action → confirmation
+ `.ics`.

## W6 — Hosting & domain · DECIDED

Vercel. Production host is env-driven (`NEXT_PUBLIC_SITE_URL`, default
`https://altavibracion.resuelv.com`, a subdomain of `resuelv.com`); no code change
needed to move domains.

## W7 — Dark mode · DEFERRED

The DS ships no dark palette. Light-only until a design-first pass exists.

## W8 — Payment gateway (Pago) · OPEN — Phase 2

Card / PSE / Nequi in COP. Recommendation: **Wompi** (Bancolombia; first-class
Nequi + PSE, clean API + webhooks). Alternatives: Mercado Pago, ePayco, PayU.
Stripe alone does not cover PSE/Nequi. Validate fees and payout terms with the
real merchant account before committing.

## W9 — Transactional email · OPEN

Needed for proactive confirmations/reminders (W4 Phase-1 minimum is screen +
`.ics`). Candidates: Resend, Postmark, Brevo. Small volume; pick the cheapest
reliable one; es-CO templates in the brand voice.

## W10 — Icons: Material Symbols vs Lucide · OPEN (inherited from the DS)

The Figma uses Material Symbols Rounded; the DS previews substituted Lucide. The
DS recommends returning to self-hosted Material Symbols for production.

## W11 — Planning workspace · DECIDED (2026-09-15)

`saas-planner` retired. Decisions here, rationale in `docs/adr/`, work items in
this repo's GitHub issues. Do not open or cite planner issues for new work.

---

## Legacy issue map (retired `saas-planner`)

Kept so old commits (`feat: … (oscar-ospina/saas-planner#N)`) and code comments
stay readable.

| Planner # | What it was | Outcome |
| --- | --- | --- |
| #16 | Epic — marketing landing MVP (stories #17–#26) | Shipped 2026-06-07 |
| #17 | Spike — app framework | ADR → W1 |
| #18 | Spike — brand layer | ADR → W2 |
| #19–#26 | Landing stories: scaffold, brand theme, shell, SEO, hero/trust, why-numerology, consultations, legal pages | Shipped |
| #30 | DS bug — `@saas/ui` Button focus ring does not render in Tailwind v4 | **Still open**; belongs in `saas-packages` issues now. `app/brand.css` carries the workaround |
| #31 | Epic — booking & checkout | In progress (W3–W5) |
| #32 / #33 | Spikes — Google Calendar / backend & data | ADRs → W3 / W4 |
| #35 | Epic — landing visual fidelity to Figma (stories #36–#39) | Shipped 2026-06-07 |
| #40 | GCal server client + runbook + smoke-test | Merged; live verification pending |
| #41 / #43 / #44 | Availability, booking Server Action, confirmation + `.ics` | Deferred (W5) |
| #42 | Agenda UI | Covered by #45 |
| #45 | Agenda local MVP + WhatsApp handoff | Shipped 2026-06-10 (W5) |
