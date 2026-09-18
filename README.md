# alta-vibracion-web

The Alta Vibración site: Liliana Tobón's online numerology practice (Spanish, Colombia). It imports the brand-agnostic [`@saas/ui`](https://www.npmjs.com/package/@saas/ui) design system and adds the brand layer on top.

> *"No es casualidad. Es vibración."*

Live at <https://alta-vibracion-web.vercel.app>.

## Status (2026-09-17)

Shipped: the marketing home (hero, why numerology, about Liliana, consultations grid), legal pages, contact page, SEO, Vercel analytics with conversion events, WCAG 2.2 AA pass.

In progress, following `../Alta_Vibracion_729_Plan_Ejecucion_V1.md` section 11:

1. Catalog replaced by the plan's three services (Mi Mapa 729, Mi siguiente paso 729, Regala Mi Mapa 729).
2. Agenda on Postgres (Neon): real availability, holds, booking codes, admin confirmation. Decision in [`docs/adr/2026-09-17-agenda-postgres.md`](docs/adr/2026-09-17-agenda-postgres.md). The Google Calendar path from June is archived in `docs/archive/adr/`.

Before public launch: fill the `[POR CONFIRMAR]` markers in `content/terms.md` and `content/privacy.md` and get them reviewed, set `NEXT_PUBLIC_SITE_URL` to the real host, add an OpenGraph image.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, `@saas/ui`, `next/font` (Archivo + Open Sans), `@vercel/analytics`, `react-markdown` for the legal pages. Light theme only.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

```bash
npm run build      # next build
npm run start      # serve the production build
npm run lint
npm run typecheck
```

Node 20.9 or newer. CI runs lint, typecheck and build on every push and PR.

## Layout

```
app/            routes (home, agenda, contact, terms, privacy), layout, globals.css, brand.css
components/     brand/ (logo, CTAs), layout/ (top bar, footer, WhatsApp FAB), sections/, agenda/
content/        terms.md, privacy.md, contact.md (read at build time)
lib/            site.ts (contact, routes), consultations.ts (catalog), agenda.ts, legal.ts
docs/adr/       current decisions; docs/archive/adr/ superseded ones
```

## Notes

- ESLint stays on v9 until `eslint-config-next`'s plugins support v10.
- Brand specifics live here, not in `@saas/ui`.
- `@saas/ui@0.2.0` ships no `"use client"`; Radix-backed components need a client boundary in this repo.
