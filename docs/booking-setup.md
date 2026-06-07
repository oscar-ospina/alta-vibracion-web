# Booking setup — Google Calendar (epic #31, Phase 1)

One-time setup so the in-app **Agenda** can read Liliana's availability and write booked
appointments to her real Google Calendar. Do this once; then `npm run smoke:calendar`
verifies it end-to-end.

This implements the two ADRs (the design rationale lives there, not here):

- [Google Calendar integration](https://github.com/oscar-ospina/saas-planner/blob/main/docs/superpowers/specs/2026-06-07-av-google-calendar.md) (#32)
- [Booking backend & data](https://github.com/oscar-ospina/saas-planner/blob/main/docs/superpowers/specs/2026-06-07-av-booking-backend.md) (#33)

## The auth model in one paragraph

The app authenticates as a **Google Cloud service account** (a robot account with its own
JSON key — no user login, no OAuth consent screen, no token refresh). Liliana **shares her
personal calendar** with that service account (ACL role *writer*). The app then reads/writes
**her** calendar by its id. The booked event is a **time-block with no attendees** (a service
account can't send Google invitations without domain-wide delegation, which is impossible on
a personal `@gmail.com`); the client instead gets a confirmation + an `.ics` from the app.

> ⚠️ The one non-obvious gotcha: **typing the service-account address into Google Calendar's
> "Share with specific people" UI silently fails for robot accounts.** You must grant access
> via the API (`Acl.insert`) — Step 4 below. This is the single most common reason the
> integration "doesn't work".

---

## Prerequisites

- A Google account that owns the booking calendar — **Liliana's** `@gmail.com`.
- A Google Cloud account (the project can be owned by the dev; only the *calendar share*
  must be done by Liliana). Free tier is ample — Calendar API has no cost at this volume.

---

## Step 1 — GCP project + enable the Calendar API

1. Go to <https://console.cloud.google.com/> → create or select a project (e.g.
   `alta-vibracion`).
2. **APIs & Services → Library →** search **"Google Calendar API" → Enable**.

## Step 2 — Service account + JSON key

1. **APIs & Services → Credentials → Create credentials → Service account.**
   - Name it e.g. `av-booking`. No project roles are needed (it accesses the calendar via
     the calendar's own ACL, not IAM). Skip the optional grants → **Done**.
2. Open the new service account → **Keys → Add key → Create new key → JSON → Create.**
   A `*.json` file downloads. **Treat it as a password.**
3. Note the service-account **email** — it looks like
   `av-booking@<project-id>.iam.gserviceaccount.com`. You need it in Step 4.

## Step 3 — Encode the key + set env vars

The key goes into **one base64 env var** (base64 avoids the classic newline-mangling bug
with multi-line private keys):

```bash
# from the folder where the JSON downloaded:
base64 -w0 av-booking-*.json   # Linux
base64 av-booking-*.json       # macOS (no -w0)
```

Set these (see `.env.example`):

| Var | Value | Scope |
|-----|-------|-------|
| `GOOGLE_SERVICE_ACCOUNT_KEY_B64` | the base64 string from above | **server-side secret** |
| `LILIANA_CALENDAR_ID` | Liliana's gmail address (her calendar id) — **never** `primary` | server-side |

- **Local:** put both in `.env.local` (git-ignored). Used by `npm run dev` and the smoke-test.
- **Vercel:** **Project → Settings → Environment Variables**, add both to the **Production**
  scope (and Preview if you test there), then **redeploy** — env changes only take effect on
  a new deploy. **Never** prefix either with `NEXT_PUBLIC_` (that would ship the key to the
  browser).

## Step 4 — Share Liliana's calendar with the service account (`Acl.insert`)

**This must be done by Liliana** (only the calendar owner can grant access), and **via the
API, not the Calendar UI.** Easiest path is Google's APIs Explorer (no code):

1. Liliana opens the **`acl.insert`** "Try this method" panel:
   <https://developers.google.com/workspace/calendar/api/v3/reference/acl/insert>
2. In the right-hand panel, sign in / authorize **as Liliana** (it will request the
   `calendar` scope).
3. Set the parameters + body:
   - **calendarId:** `primary` (she's acting on her own calendar) — or her email address.
   - **Request body:**
     ```json
     {
       "role": "writer",
       "scope": { "type": "user", "value": "av-booking@<project-id>.iam.gserviceaccount.com" }
     }
     ```
   - Use the **real service-account email** from Step 2.
4. **Execute.** A `200` with an ACL rule for the SA email = done.
5. **Verify** with **`acl.list`** (same Explorer page, `calendarId: primary`): the response
   should include a rule `{ "scope": { "type": "user", "value": "<SA email>" }, "role": "writer" }`.

> ACL changes can take a short moment to propagate before the API sees write access — if the
> smoke-test's insert 403s immediately after sharing, wait a minute and re-run.

## Step 5 — Verify live (`npm run smoke:calendar`)

With env vars in `.env.local`:

```bash
npm run smoke:calendar
```

It will, against the real calendar:

1. **list** events for the next 14 days (proves read access),
2. **insert** a clearly-labelled test time-block ~60 days out at 05:00 Bogotá and confirm
   the time round-trips as UTC-5,
3. **re-insert** the same deterministic id and confirm it returns **409** (the double-book
   idempotency guard),
4. **delete** the test event (cleanup),
5. probe whether a **deleted id is reusable** (resolves an open design question for #43).

A green run ends with `✅ Smoke-test passed`. With no credentials it prints this runbook's
path and exits — it never runs blind.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `CalendarConfigError: GOOGLE_SERVICE_ACCOUNT_KEY_B64 is not set` | env var missing — Step 3 (and `.env.local` for local runs). |
| `...is not valid base64` / `does not decode to valid JSON` | re-encode the key with `base64 -w0`; copy the whole single line. |
| `403 ... insufficient permissions` / forbidden on insert | the calendar share (Step 4) didn't take. Confirm with `acl.list`; remember the **UI share silently fails** — use `Acl.insert`. Wait ~1 min for propagation. |
| inserted event shows the **wrong hour** | should not happen — times are sent as `-05:00` + `timeZone: America/Bogota`. If it does, check the machine isn't overriding `TZ`. |
| `404` on the calendar | `LILIANA_CALENDAR_ID` wrong, or it's set to `primary` (that's the SA's empty calendar — use Liliana's email). |

## Security notes

- The JSON key is a **long-lived secret**. Keep it out of git (only `.env.local`, which is
  ignored, and Vercel's encrypted env store). Rotate it (Step 2) if it ever leaks.
- Scope is least-privilege **`calendar.events`** — the app can read/write events but not
  manage sharing or other calendars.
- `lib/calendar.ts` is **server-only**; never import it from a Client Component.
