# alta-vibracion-web

The Alta Vibración site: Liliana Tobón's online numerology practice (Spanish, Colombia). It imports the brand-agnostic [`@saas/ui`](https://www.npmjs.com/package/@saas/ui) design system and adds the brand layer on top.

> *"No es casualidad. Es vibración."*

Live at <https://alta-vibracion-web.vercel.app>.

## Status (2026-09-18)

Shipped: the marketing home (hero, why numerology, about Liliana, consultations grid), legal pages, contact page, SEO, Vercel analytics with conversion events, WCAG 2.2 AA pass.

Following `../Alta_Vibracion_729_Plan_Ejecucion_V1.md` section 11:

- Catalog = the plan's three services (Mi Mapa 729, Mi siguiente paso 729, Regala Mi Mapa 729). `lib/consultations.ts`.
- Agenda on Postgres, live in production on Neon since 2026-09-18. Weekly rules (Monday–Thursday 18:00 Bogotá) plus per-date exceptions, 24-hour holds, public booking code with a status page, `/admin` to confirm payments. Decision in [`docs/adr/2026-09-17-agenda-postgres.md`](docs/adr/2026-09-17-agenda-postgres.md); setup and operations in [`docs/agenda-setup.md`](docs/agenda-setup.md). Without `DATABASE_URL` the agenda falls back to WhatsApp.
- Not built yet: payment gateway, gift codes (REG-01 sells via WhatsApp), day-14 follow-up task, notifications beyond the WhatsApp handoff.

Before public launch: fill the 19 `[POR CONFIRMAR]` markers in `content/terms.md` and `content/privacy.md` and get them reviewed (one names the fields the agenda stores), define gift conditions before REG-01 becomes bookable, set `NEXT_PUBLIC_SITE_URL` to the real host, add an OpenGraph image.

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
app/            routes (home, agenda, agenda/[code], admin, contact, terms, privacy), server actions
components/     brand/ (logo, CTAs), layout/ (top bar, footer, WhatsApp FAB), sections/, agenda/
content/        terms.md, privacy.md, contact.md (read at build time)
db/             Drizzle schema + lazy client; drizzle/ holds the SQL migrations
lib/            site.ts, consultations.ts (catalog), agenda/ (time, availability, bookings), admin-auth
proxy.ts        Basic-auth challenge for /admin
tests/db, e2e/  node:test DB tests; Playwright specs
docs/adr/       current decisions; docs/archive/adr/ superseded ones
```

## Notes

- ESLint stays on v9 until `eslint-config-next`'s plugins support v10.
- Brand specifics live here, not in `@saas/ui`.
- `@saas/ui@0.2.0` ships no `"use client"`; Radix-backed components need a client boundary in this repo.
