# Delivery tracking and the session report live in the admin

Date: 2026-09-18. Decided by Óscar to close the admin items of the launch plan (sections 11 "Prioridad 1", 13 "Vista administrativa" and 14 "Desarrollo para Óscar").

## Decision

- The pipeline after payment (form received, session attended, day-14 follow-up) is three nullable instants on `bookings`, set by hand from `/admin`. `booking_status` keeps its four values, so the double-booking guard's predicate is untouched.
- The session summary is a `reports` row per booking with `draft`, `reviewed` and `approved` states. The client's status page shows the body only while it is `approved`; a later save as draft or reviewed withdraws it. Approving needs an attended session and a non-empty body.
- A session marked attended can no longer be cancelled.
- The pre-session form stays outside this app. The plan (section 6) makes it collect acceptance of versioned terms and privacy notice, and those texts still carry `[POR CONFIRMAR]` markers. Until Liliana signs them off the app only records that the form arrived.
- The operating script (plan section 3) and the seven-day plan (section 10) are Markdown under `content/admin/`, rendered at `/admin/script`, prerendered at build time. The version line at the top of `script.md` changes when Liliana approves a new script; git keeps the history.

## What this stores

The report body is Liliana's consultation note about one client. It is personal data of the kind the plan calls "notas de consulta": kept in the database behind admin credentials, shown to the client only by their booking code, never in URLs, analytics or logs. The `[POR CONFIRMAR]` marker in `content/privacy.md` about what the agenda stores now names it.

## Out of scope, on purpose

Commercial and money records (plan section 8 keeps them in Liliana's spreadsheet; no CRM), timer marks per block, notifications, gift codes, payment gateway.
