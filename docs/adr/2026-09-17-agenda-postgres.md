# Agenda on Postgres (Neon), not Google Calendar

Date: 2026-09-17. Decided by Óscar after reviewing the launch plan `Alta_Vibracion_729_Plan_Ejecucion_V1.md` (section 11) with Liliana's operating decisions.

## Decision

The booking agenda lives in a Postgres database (Neon in production, a Docker container locally). Google Calendar is out. The June ADRs that chose Google Calendar as the only source of truth and ruled out a database are archived under `docs/archive/adr/`.

## Why

- The plan needs temporary holds with expiry, server-verified payment state, a public booking code with a readable status, gift codes with states, and a private admin view. None of those fit in calendar events.
- The Google Calendar path was blocked on infrastructure only Liliana could provision (service-account key plus a calendar share via API). It never ran live.
- Liliana keeps her own calendar by hand. The database is the source of truth for what the site can sell; she copies confirmed sessions into her calendar.

## Rules the implementation must keep

- A time slot cannot be sold twice. A partial unique index on `bookings.starts_at` for the statuses that block a slot is the guarantee. Application code only reports the conflict.
- A pending booking blocks its slot until `hold_expires_at`. Expired holds are swept inside the same transaction that inserts a new booking. No cron.
- Payment is verified by a human. A booking becomes `confirmed` only through the admin action, never from the visitor's browser.
- Every server action that mutates data checks admin credentials itself. The route-level guard in `proxy.ts` is a convenience, not the boundary.
- Instants are stored as `timestamptz`. Liliana's zone is `America/Bogota` (fixed UTC-5, no daylight saving). The visitor's IANA zone is stored with the booking and shown next to the Bogotá time before they confirm.
- No personal data in URLs, analytics events, logs or fixtures. Bookings hold a preferred name and one contact channel only. The pre-session form lives outside this app.
- Without `DATABASE_URL` the site still builds and `/agenda` shows the manual path (WhatsApp).

## Consequences

- `pg` + Drizzle ORM, one driver for local Docker and Neon's pooled connection string.
- Migrations are committed SQL under `drizzle/` and applied with `npm run db:migrate`.
- CI runs the DB tests and Playwright E2E against a `postgres:16` service.
