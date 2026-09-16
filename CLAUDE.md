@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The **Alta Vibración** consumer web app: the marketing site + booking flow for
Liliana Tobón's numerology practice (Spanish, Colombia). It imports the
brand-agnostic `@saas/ui` design system and adds the brand layer here.

## Commands

```bash
npm run dev            # http://localhost:3000
npm run build          # next build — marketing pages prerender statically
npm run start          # serve the production build
npm run lint           # eslint (flat config)
npm run typecheck      # tsc --noEmit
npm run smoke:calendar # live Google Calendar check; skips without credentials
```

Node ≥ 20.9 (Next 16). CI runs lint + typecheck + build on push/PR. There is no
test suite. **Verify visual/CSS changes against a fresh build**
(`rm -rf .next && npm run dev`, or `npm run build && npm run start`): Turbopack dev
HMR can serve stale CSS for new arbitrary utilities. Details in
`docs/frontend-notes.md`.

## Planning

- `docs/DECISIONS.md` — decision index (W1–W11) + the map of legacy `saas-planner#N`
  issue numbers. Check it before adding a dependency, service or pattern.
- `docs/adr/` — long-form ADRs: app framework, brand layer, Google Calendar
  integration, booking backend. The two booking ADRs are load-bearing before any
  real-calendar work; the shipped Agenda is a local MVP by owner decision (W5).
- `README.md` — shipped status and the pre-launch checklist. Work items are this
  repo's GitHub issues; the `saas-planner` repo is retired.

## Architecture

- **Next.js 16 App Router + TypeScript + Tailwind v4 + React 19**, static by
  default. `app/` routes: Home, `/agenda`, legal pages; `components/{brand,layout,
  sections,agenda}`; `lib/` for site config, catalog and helpers; `content/*.md`
  for legal copy.
- **Design-system wiring** (`docs/adr/2026-06-06-av-app-framework.md`):
  `app/globals.css` does `@import "@saas/ui/theme.css"` + `@source
  "../node_modules/@saas/ui"`; `app/brand.css` holds brand aliases, gradients and
  heading/focus rules. `next/font` self-hosts Archivo + Open Sans as
  `--font-archivo` / `--font-open-sans` — the names the DS theme expects, don't
  rename them. Palette and type come from the DS; only brand specifics (logo SVGs,
  copy, imagery, brand compositions) live here. Use DS tokens, never invent styles;
  never fork brand values into the DS.
- **Legal pages**: Markdown in `content/*.md` is read at build time by
  `lib/legal.ts` and rendered by `components/sections/prose.tsx` with
  `react-markdown` (raw HTML disabled). No runtime fs; pages stay prerendered.
  The copy is a draft with `[POR CONFIRMAR: …]` placeholders and a `<DraftNotice>`
  banner until legal review.
- **Agenda (local MVP)**: `lib/agenda.ts` = pure slot helpers, Bogotá-anchored
  dates; `lib/agenda-store.ts` = `localStorage` persistence (key `av-agenda-v1`,
  simulated "Reservado" slots + the visitor's own booking); `components/agenda/` =
  UI. Confirming opens WhatsApp; there is no backend.
- **Google Calendar client** (`lib/calendar.ts`, `scripts/smoke-calendar.ts`,
  runbook `docs/booking-setup.md`): merged but not live-verified. `googleapis` is
  Node-only, so any route/action importing it must `export const runtime =
  "nodejs"`. Env: `GOOGLE_SERVICE_ACCOUNT_KEY_B64`, `LILIANA_CALENDAR_ID`
  (server-side only, never `NEXT_PUBLIC_`).
- **Site URL**: `NEXT_PUBLIC_SITE_URL` (default `https://altavibracion.resuelv.com`)
  drives `metadataBase`, sitemap and robots.
- **Conversion tracking**: `track("book_consultation", { source })` fires from the
  top bar `BookingButton`, the FAB (`whatsapp-fab.tsx`, source `"fab"`) and the
  Agenda's WhatsApp handoff (source `"agenda"`); hero + consultations grid fire
  `open_agenda` via `AgendaCta`. Route any new WhatsApp CTA through one of these.

## Conventions

- **ESLint stays on `^9`**: `eslint-config-next`'s bundled import/jsx-a11y plugins
  cap at 9; bumping breaks `npm run lint`.
- **Light-only**: the DS ships no dark palette.
- **RSC**: `@saas/ui@0.2.0` ships no `"use client"`. Button/Badge/Card are
  server-safe; Radix-backed Dialog/Select/Toast need a `'use client'` boundary here.
- **Focus ring**: `app/brand.css` has an unlayered `[data-slot="button"]:focus-visible`
  outline because the DS Button's box-shadow ring does not render in this Tailwind
  v4 build (open DS bug, formerly planner #30). Keep it until the DS fixes it. Other
  interactive elements use `focus-visible:outline-[3px] outline-ring`.
- **Tailwind v4 quirks**: `group-open:` compiles to nothing — use `[[open]_&]:…`;
  `rotate-*` sets the `rotate:` property, so use `transition-[rotate]`; gradient
  text via `.text-gradient-brand`, not inline `bg-clip-text`; bleed-image cards
  override the DS `Card` with `rounded-[2rem] border-0 p-0`. See
  `docs/frontend-notes.md`.
- **Product copy**: Spanish (Colombia), **tú**; currency `COP 150.000`;
  consultations are "Citas" 1–4 with a theme; voice spiritual but grounded, never
  salesy; sentence case. Tagline *"No es casualidad. Es vibración."*
- Commits: conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`), imperative
  summary; PRs `Closes #N` against this repo's issues.
- Design reference: Claude Design workspace "AltaVibración Design System"
  (project `6e43ffb4-24c4-4461-a4aa-81ee1ce59892`); the design-side twin is
  documented in `saas-packages/CLAUDE.md`.
