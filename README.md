# alta-vibracion-web

The Alta Vibración site: Liliana Tobón's online numerology practice (Spanish, Colombia). It imports the brand-agnostic [`@saas/ui`](https://www.npmjs.com/package/@saas/ui) design system and adds the brand layer on top.

> *"No es casualidad. Es vibración."*

Live at <https://alta-vibracion-web.vercel.app>.

## Status (2026-09-23)

Shipped: the marketing home (hero, first session, 729 universe, why numerology, about Liliana), the four line pages with their detail pages, the gift page, legal pages, contact page, SEO, Vercel analytics with conversion events, WCAG 2.2 AA pass.

Following `../Alta_Vibracion_729_Plan_Ejecucion_2309.md` (plan V2.1, October 2026; decisions in [`docs/adr/2026-09-23-plan-v21.md`](docs/adr/2026-09-23-plan-v21.md)):

- Catalog by states in `lib/catalog.ts`: only Mi Mapa 729 (YO-01) is `active` and sells; Mi Camino 729, Mi Huella 729 and the Nosotros, Celebremos and Empresas lines are in preparation (no price, no calendar, interest CTA). The gift of the first session is a modality of YO-01, presented at `/regalar` and from the home, the menu, the Mi Mapa 729 page and `/celebremos`.
- Navigation: Inicio / Yo · 7 / Nosotros · 2 / Celebremos · 9 / Empresas / Regalar una cita, with a mobile menu. Public routes for these pages use the plan's Spanish slugs.
- Interest capture in Postgres (`interests` table, `lib/interests.ts`): "Avísame cuando esté disponible" on every future service, the company form on `/empresas`, and the assisted gift inquiry on `/regalar`. Minimal data (preferred name, one channel, consent for that one notice; companies add organization and topic; the gift never asks about the beneficiary). A repeated form updates the open row instead of creating a second person. Contact values are stored normalized (`lib/contact.ts`) so campaigns can match them later. `/admin/interests` lists gifts to consult, interest in future services and companies, with contacted/closed marks. Without a database the forms offer WhatsApp and never show a success.
- Agenda on Postgres, live in production on Neon since 2026-09-18. Weekly rules (Monday–Thursday 18:00 Bogotá) plus per-date exceptions, 24-hour holds, public booking code with a status page, `/admin` to confirm payments. Decision in [`docs/adr/2026-09-17-agenda-postgres.md`](docs/adr/2026-09-17-agenda-postgres.md); setup and operations in [`docs/agenda-setup.md`](docs/agenda-setup.md). Without `DATABASE_URL` the agenda falls back to WhatsApp.
- Delivery in `/admin` since 2026-09-18: per-booking page with form-received, session-attended and day-14 follow-up marks; a report editor (draft / reviewed / approved, template from the plan's section 3) whose approved text shows on the client's `/agenda/[code]` page; pending lists for forms, deliveries and follow-ups; `/admin/script` with the operating script and the seven-day plan (`content/admin/`). Decision in [`docs/adr/2026-09-18-delivery-in-admin.md`](docs/adr/2026-09-18-delivery-in-admin.md).
- Campaigns "Encuentro 729" (`campaigns` table, `lib/campaigns.ts`): Liliana creates one per event in `/admin/campaigns` (price, threshold, promo cupos, conditions, gift allowed or not) and prints its link `/encuentros/<code>`. Before activation the link registers interest, free. She activates by hand (48-hour window by default, editable, a checkbox to override the threshold); then the page shows the price, the deadline in Colombia and local time and the conditions, and sends into `/agenda?campana=<code>`. The server applies the campaign price only when the campaign is active, the contact matches a registration and a promo cupo is free (a pending order holds one for its hold hours); anything else is an explicit error, never a silent general price. Expired, sold out and closed links get a clear message and the general alternative. The price is frozen on the booking.
- Not built yet (in the order of the plan's section 12): Bre-B payment instructions and manual bookings from the admin, gift orders with voucher codes, CSV export and the operating guide. Deferred: survey, newsletter, payment gateway, the pre-session form itself (external until the legal texts are signed).

Before public launch: fill the 19 `[POR CONFIRMAR]` markers in `content/terms.md` and `content/privacy.md` and get them reviewed (one names the fields the agenda stores), define the gift conditions (vigencia, cambios, reembolso) before gift orders can be paid (the gift is `allowsGift` on YO-01; orders arrive in delivery step 4), set `NEXT_PUBLIC_SITE_URL` to the real host, add an OpenGraph image.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, `@saas/ui`, `next/font` (Archivo + Open Sans), `@vercel/analytics`, `react-markdown` for the legal pages. Light theme only.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

```bash
npm run db:migrate # apply drizzle/*.sql to DATABASE_URL
npm run db:seed    # Monday–Thursday 18:00 rules
npm run build      # next build
npm run start      # serve the production build
npm run lint
npm run typecheck
npm run test       # database tests (needs Postgres)
npm run test:e2e   # Playwright against the build
```

Node 20.9 or newer. CI runs lint, typecheck, DB tests, build and E2E on every push and PR, with a `postgres:16` service.

## Layout

```
app/            routes (home, yo, yo/[slug], nosotros, nosotros/[slug], celebremos, empresas, regalar, encuentros/[codigo], agenda, agenda/[code], admin, admin/bookings/[id], admin/interests, admin/campaigns, admin/script, contact, terms, privacy), server actions (agenda/, interests/, admin/)
components/     brand/ (logo, CTAs), layout/ (top bar, nav, footer, WhatsApp FAB), sections/, catalog/ (cards, line and service templates, gift block), agenda/
content/        terms.md, privacy.md, contact.md, admin/ (script, week plan); all read at build time
db/             Drizzle schema + lazy client; drizzle/ holds the SQL migrations
lib/            site.ts, catalog.ts (services, lines, statuses), contact.ts, interests.ts, campaigns.ts, agenda/ (time, availability, bookings, delivery), admin-auth
proxy.ts        Basic-auth challenge for /admin
tests/db, e2e/  node:test DB tests; Playwright specs
docs/adr/       current decisions; docs/archive/adr/ superseded ones
```

## Notes

- ESLint stays on v9 until `eslint-config-next`'s plugins support v10.
- Brand specifics live here, not in `@saas/ui`.
- `@saas/ui@0.2.0` ships no `"use client"`; Radix-backed components need a client boundary in this repo.
