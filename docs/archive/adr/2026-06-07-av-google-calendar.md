# Alta Vibración — Google Calendar integration (booking Phase 1)

**Date:** 2026-06-07
**Status:** Decided
**Spike:** [oscar-ospina/saas-planner#32](https://github.com/oscar-ospina/saas-planner/issues/32)
**Parent epic:** [oscar-ospina/saas-planner#31](https://github.com/oscar-ospina/saas-planner/issues/31)
**Pairs with:** [Booking backend & data ADR](2026-06-07-av-booking-backend.md) ([#33](https://github.com/oscar-ospina/saas-planner/issues/33))

## Decision

For Phase 1 (**booking-only**, no online payment), read and write Liliana's Google Calendar with a **Google Cloud service account** that Liliana **shares her personal calendar with** (ACL role `writer` = "Make changes to events"). No OAuth user flow, no domain‑wide delegation (DWD), no stored refresh token.

The created Google event is a **time‑block only — no `attendees`**. The client's booking confirmation is delivered through the app's **own channels (WhatsApp + email)**, which are already wired, plus an **`.ics` attachment** in the confirmation email so the client still gets a calendar entry **without** needing a Google attendee invite.

- **Auth:** service‑account JSON key in a Vercel **server‑side** env var (never `NEXT_PUBLIC_`), base64‑encoded as a single value.
- **Calendar target:** `calendarId` = **Liliana's gmail address** (the shared calendar), never `"primary"` (a service account's own primary calendar is empty).
- **Scope:** least‑privilege **`https://www.googleapis.com/auth/calendar.events`** — and read availability via **`events.list(timeMin, timeMax, singleEvents:true)`** rather than `freebusy.query` (see Rationale; `freebusy.query` needs a broader scope).
- **Timezone:** compute in **America/Bogotá (UTC‑5, no DST)**; send events as RFC3339 with an explicit `-05:00` offset **and** `timeZone: "America/Bogota"`.

**Rejected:**
- **OAuth2‑as‑Liliana (refresh token)** — the *only* thing it adds over the service account is a native Google attendee‑invite to the client, which we don't need (we notify via WhatsApp/email + `.ics`). In exchange it adds a recurring failure mode: a consumer‑gmail OAuth app left in "Testing" expires refresh tokens in ~7 days, so it must be **published/verified**, and you must handle revocation / `invalid_grant` re‑auth. No benefit, real cost, for a single fixed calendar owner.
- **Domain‑wide delegation** — structurally **impossible** on a personal `@gmail.com` account: DWD is configured only in the Google Workspace Admin console by a super‑admin, and a consumer account belongs to no Workspace domain.

## Context

Epic #31 Phase 1 turns booking intent (today routed to WhatsApp) into a real in‑app *Agenda*: a client picks an open slot, and the app blocks that time on Liliana's calendar and confirms. Liliana most likely uses a **personal Google account (gmail), not Google Workspace** — which removes DWD from the table and shapes the whole decision. The app already owns client communication (WhatsApp click‑to‑chat throughout, email via the contact channels), so Google does **not** need to be the notification channel.

> ⚠️ **"Confirmed working" is design‑validated, not live‑run.** No live Google Calendar call was made in this spike (no GCP project / service‑account key / shared calendar exists yet). Every API claim below is grounded in official Google docs (cited). The **runtime smoke‑test of `events.list` + `events.insert` with real credentials in the Bogotá timezone is the first task of the implementation story.**

## Comparison (auth options)

| Option | Works on personal gmail? | Invites client as attendee? | Token lifecycle | Setup | Verdict |
|---|---|---|---|---|---|
| **(a) Service account + shared calendar** | ✅ yes (owner shares calendar to SA email) | ❌ no (SA can't add attendees without DWD) | none (long‑lived key) | one‑time share + key in env | **Chosen** — client notified via app channels + `.ics` |
| (b) Service account + DWD | ❌ Workspace‑only | ✅ | none | needs Workspace + super‑admin | Impossible here |
| (c) OAuth2‑as‑Liliana + refresh token | ✅ | ✅ | refresh token (7‑day expiry unless app published; revocation) | consent screen + publish/verify | Rejected — cost without Phase‑1 benefit |

## Rationale

- **DWD is off the table** — Google's delegation docs: access to a user's data on a Workspace domain must be granted by a **super administrator via the Admin console**; consumer gmail has no Admin console. (Corroborated by the documented `403 forbiddenForServiceAccounts` "Service accounts cannot invite attendees without Domain‑Wide Delegation of Authority".)
- **A service account CAN use a *shared* personal calendar** with only its own key — the owner adds the SA email under the calendar's ACL with the `writer` role ("read and write access to the calendar"), then the app calls the API against that **calendarId**. This is a documented, supported path that needs neither DWD nor OAuth.
- **The one limitation (no attendees) is sidestepped by design.** We never pass `attendees`/`sendUpdates`; the event is a private time‑block on Liliana's calendar. The client gets a WhatsApp/email confirmation **plus an `.ics` file** — which places the appointment on the client's own calendar **without** any Google invite. This converts OAuth2's sole advantage into a non‑issue.
- **Scope / read‑path:** `calendar.events` ("View and edit events on all your calendars") is sufficient to **insert** events and to **list** events, but it does **not** authorize `freebusy.query` (which needs `calendar`, `calendar.freebusy`, or `calendar.events.freebusy`). Rather than broaden the scope or split it, read busy windows with **`events.list(timeMin, timeMax, singleEvents:true)`** on the single shared calendar and compute the open‑slot complement in code — clean, least‑privilege, one scope. (`freebusy.query` remains a valid alternative if multi‑calendar busy aggregation is ever needed — it would require the broader `calendar` scope.)

## Recipe (implementation story — validate live with real creds)

**Human prerequisites (one‑time, by Liliana / an owner):**
1. Google Cloud Console → create/select a project → **enable the Google Calendar API**.
2. Create a **service account** → Keys → create a **JSON key**, download it.
3. Grant the SA `writer` access to Liliana's calendar. ⚠️ **Typing the SA address into Calendar's "Share with specific people" UI silently fails for non‑human accounts** — the robust path is **`Acl.insert`** run once by the owner (or a one‑off script) and then **verify the ACL entry exists** via `Acl.list`. Role = `writer`.
4. In Vercel, store the **whole JSON key base64‑encoded** as one server‑side env var (e.g. `GOOGLE_SERVICE_ACCOUNT_KEY_B64`) in **Production** scope, then **redeploy**. (Base64 avoids the classic `GOOGLE_PRIVATE_KEY` `\n`‑escape‑mangling bug.)

**Server code (Node.js runtime; `googleapis` is not Edge‑compatible):**
```ts
import { google } from "googleapis";
const key = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64!, "base64").toString(),
);
const auth = new google.auth.GoogleAuth({
  credentials: key,
  scopes: ["https://www.googleapis.com/auth/calendar.events"],
});
const cal = google.calendar({ version: "v3", auth });
const CALENDAR_ID = process.env.LILIANA_CALENDAR_ID!; // her gmail, NOT "primary"

// READ busy → compute slots (timezone = America/Bogota)
const { data } = await cal.events.list({
  calendarId: CALENDAR_ID, timeMin, timeMax, singleEvents: true, orderBy: "startTime",
});

// CREATE a time-block (no attendees). Deterministic id → see the backend ADR (#33).
await cal.events.insert({
  calendarId: CALENDAR_ID,
  requestBody: {
    id: deterministicSlotId,                       // see #33 (idempotency)
    summary: "Cita — <cliente>",
    start: { dateTime: "2026-06-10T15:00:00-05:00", timeZone: "America/Bogota" },
    end:   { dateTime: "2026-06-10T16:00:00-05:00", timeZone: "America/Bogota" },
    extendedProperties: { private: { cliente, canal: "web", idempotencyKey } },
    // NO attendees / sendUpdates — client is notified via app WhatsApp/email + .ics
  },
});
```

**Slot derivation (specify in the implementation story; sensible Phase‑1 defaults):**
- **Working hours** as config (per weekday), in America/Bogotá.
- **Granularity** = the per‑cita duration (e.g. 60 min), optionally with a **buffer** (e.g. 15 min) between citas.
- **Lead time**: no same‑day‑within‑N‑hours (e.g. ≥ 24 h out).
- **Horizon**: bookable up to e.g. 30 days out (also bounds the `events.list` window — keep it modest, not a year).
- Open slots = working‑hours grid **minus** busy events **minus** lead‑time/past, all computed in Bogotá then normalized to UTC for IDs.

## Risks & caveats

- **Check‑then‑insert race** — `events.insert` is **not** atomic on availability; two clients can both pass the slot check and both insert. Mitigation lives in the **[backend ADR #33](2026-06-07-av-booking-backend.md)** (deterministic slot‑ID idempotency + low‑volume tolerance; Redis lock as the named escalation).
- **Sharing propagation** — ACL grant may take a short time before the API sees write access; verify before the first booking.
- **Timezone off‑by‑5h** is the classic bug — always send RFC3339 with the explicit `-05:00` offset and `timeZone: "America/Bogota"`; never local naive strings.
- **Future phases** that need Google itself to email guests / Google Meet links would require migrating to OAuth (option c) or a Workspace account — out of scope for Phase 1, noted so we don't paint into a corner.
- **Key is a long‑lived secret** — server‑only, rotate if leaked.

## Consequences

- Phase 1 needs **no user‑facing Google consent** and **no token refresh job** — a one‑time calendar share is the entire auth setup.
- The client's appointment reaches their calendar via **`.ics`**, not a Google invite; the confirmation UX is owned by the app (WhatsApp/email), consistent with the rest of the funnel.
- The booking write path and double‑book handling are specified in **[#33](2026-06-07-av-booking-backend.md)**.

## References

- Calendar API — auth & scopes: https://developers.google.com/workspace/calendar/api/auth
- ACL resource (`writer` role): https://developers.google.com/workspace/calendar/api/v3/reference/acl
- Calendar sharing concepts: https://developers.google.com/workspace/calendar/api/concepts/sharing
- `events.insert` reference (attendees need DWD): https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- `events.list`: https://developers.google.com/workspace/calendar/api/v3/reference/events/list
- `freebusy.query` (alternative read path; broader scope): https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Domain‑wide delegation (Workspace‑only): https://developers.google.com/workspace/cloud-search/docs/guides/delegation
- googleapis Node client (Node‑only, not Edge): https://github.com/googleapis/google-api-nodejs-client
- Vercel Node.js runtime: https://vercel.com/docs/functions/runtimes/node-js
