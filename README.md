# alta-vibracion-web

The **Alta Vibración** consumer web app — the online numerology practice of **Liliana Tobón** (Spanish, Colombia). This repo is the **product surface**: it *imports* the brand-agnostic design system [`@saas/ui`](https://www.npmjs.com/package/@saas/ui) and adds the brand layer (logo, copy, imagery) on top.

> *"No es casualidad. Es vibración."*

**Status — two epics shipped, booking is next:**

- ✅ **Marketing landing MVP** ([epic #16](https://github.com/oscar-ospina/saas-planner/issues/16), closed 2026-06-07): a Home landing that explains numerology, builds trust in Liliana, and converts visitors via **WhatsApp/contact**, plus legal pages.
- ✅ **Landing visual fidelity to Figma** ([epic #35](https://github.com/oscar-ospina/saas-planner/issues/35), closed 2026-06-07): the Home sections were brought to **design fidelity** against the Figma `UI-Exercise` — hero gradient «esencia» + line-art decoration (#37), the «¿Por qué Numerología?» bleed cosmic card with line-art faces (#38), and the «¿Quién es Liliana Tobón?» accordion + floating chips (#39).
- ▶ **In progress — booking & checkout** ([epic #31](https://github.com/oscar-ospina/saas-planner/issues/31)): the **local-MVP Agenda is shipped** ([story #45](https://github.com/oscar-ospina/saas-planner/issues/45), 2026-06-10): `/agenda` books **without a backend** — availability is simulated client-side (1–3 slots per viewed date blocked at random, persisted in `localStorage` `av-agenda-v1`), the visitor's booked slot persists too, and confirming hands the details to **WhatsApp** (Liliana syncs her real calendar manually). The hero + per-cita *Agendar* CTAs route to `/agenda`. The **real Google Calendar track is deferred**: spikes [#32](https://github.com/oscar-ospina/saas-planner/issues/32) + [#33](https://github.com/oscar-ospina/saas-planner/issues/33) resolved as ADRs; **[#40](https://github.com/oscar-ospina/saas-planner/issues/40) (the GCal server client `lib/calendar.ts` + runbook + smoke-test) is merged** but its live verification is **⏳ pending owner setup** (see below); [#41](https://github.com/oscar-ospina/saas-planner/issues/41)/[#43](https://github.com/oscar-ospina/saas-planner/issues/43)/[#44](https://github.com/oscar-ospina/saas-planner/issues/44) resume when that passes (#42's UI is essentially covered by #45). *Pago* (Wompi) stays Phase 2.

> ### ⏳ Pending — live-verify the Google Calendar integration (gates #41/#43/#44)
> #40's code is in, but its defining acceptance criteria are a **live** smoke-test against Liliana's real calendar, which needs owner-provisioned infra that doesn't exist yet. **Do this when resuming the real-calendar integration:**
> 1. Follow **[`docs/booking-setup.md`](docs/booking-setup.md)** — GCP project + Calendar API, a service-account JSON key, and Liliana sharing her calendar via **`Acl.insert`** (the Calendar UI share silently fails for service accounts).
> 2. Set `GOOGLE_SERVICE_ACCOUNT_KEY_B64` + `LILIANA_CALENDAR_ID` (in `.env.local` and Vercel **Production** + redeploy).
> 3. Run **`npm run smoke:calendar`** — a green `✅ Smoke-test passed` live-verifies #40 (and resolves a design question for #43: whether a deleted event-id is reusable).
>
> Planner [#40](https://github.com/oscar-ospina/saas-planner/issues/40) stays **open** until that run passes — **green CI does not verify the integration** (the smoke-test is skipped without credentials).

**Shipped:** Home (Figma-faithful hero + WhatsApp FAB, trust sections, consultations grid with per-cita *Agendar* → `/agenda`), the **in-app Agenda** (`/agenda`, local MVP #45: simulated availability + WhatsApp handoff), shared shell (TopBar/Footer/skip-link), brand layer (logo/fonts/tokens), legal pages (Términos / Política de Privacidad / Contacto), SEO (sitemap/robots/OpenGraph), Vercel Web Analytics with per-CTA conversion events (+ `open_agenda` funnel event), es-CO formatting, and a WCAG 2.2 AA pass (3px focus ring, AA contrast, keyboard-reachable).

**⚠️ Before public launch** (none block the epic): fill the 14 `[POR CONFIRMAR: …]` placeholders in `content/terms.md` + `content/privacy.md` and have the legal copy reviewed (then drop the `<DraftNotice>` banner); set the real production host via `NEXT_PUBLIC_SITE_URL` (a subdomain of `resuelv.com`; default `altavibracion.resuelv.com`) and deploy on Vercel; add a static OpenGraph image.

Planning, stories, and architecture decisions live in the [`saas-planner`](https://github.com/oscar-ospina/saas-planner) repo (GitHub Issues/Projects).

## Stack

- **Next.js 16** (App Router) · **TypeScript** · **React 19**
- **Tailwind v4** (`@tailwindcss/postcss`) + **`@saas/ui`** design system (+ `tw-animate-css` peer)
- **`next/font`** self-hosts **Archivo** (display) + **Open Sans** (body), wired to the DS font roles
- **`@vercel/analytics`** + **`@vercel/speed-insights`** (conversion events + Core Web Vitals; no-op until deployed on Vercel)
- **`react-markdown`** renders the legal pages from in-repo Markdown (`content/*.md`)
- es-CO content · **light-only** (the DS ships no dark palette)

The `@saas/ui` wiring follows [ADR #17](https://github.com/oscar-ospina/saas-planner/blob/main/docs/superpowers/specs/2026-06-06-av-app-framework.md): `@import "@saas/ui/theme.css"` + `@source` in `app/globals.css`, fonts supplied via `next/font`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build         # next build (static-by-default; marketing pages prerender)
npm run start         # serve the production build
npm run lint          # eslint (flat config)
npm run typecheck     # tsc --noEmit
npm run smoke:calendar # live Google Calendar check (booking #40 — needs creds)
```

Requires **Node ≥ 20.9** (Next 16). CI (`.github/workflows/ci.yml`) runs lint + typecheck + build on every push and PR.

**Booking (Google Calendar) setup.** The Agenda flow (epic #31) needs a Google service-account key and Liliana's shared calendar — a one-time setup with its own runbook: **[`docs/booking-setup.md`](docs/booking-setup.md)**. Required server-side env vars (`GOOGLE_SERVICE_ACCOUNT_KEY_B64`, `LILIANA_CALENDAR_ID`) are in `.env.example`. The site builds and runs without them; only the live booking calls need credentials.

## Layout

```
app/
├── layout.tsx            # root layout — fonts, es-CO metadata/OG, skip-link, <Analytics/>
├── page.tsx              # Home — hero + trust sections + consultations grid
├── globals.css           # @import "tailwindcss" + "@saas/ui/theme.css" + "./brand.css" + @source
├── brand.css             # brand tokens/aliases, gradients, heading + focus-ring rules
├── sitemap.ts, robots.ts # SEO, env-driven via NEXT_PUBLIC_SITE_URL
├── icon.svg              # brand-mark favicon
└── contact|terms|privacy/page.tsx   # legal pages (draft es-CO content)
components/
├── brand/                # logo, booking-button (client island — WhatsApp CTA + track())
├── layout/               # top-bar, footer, whatsapp-fab
└── sections/             # hero, why-numerology, about-liliana, consultations, prose, draft-notice
content/                  # terms.md / privacy.md / contact.md — legal copy, read at build (static)
lib/                      # site.ts (routes/contact/whatsapp/SITE_URL), consultations.ts, legal.ts, calendar.ts
scripts/                  # smoke-calendar.ts — live Google Calendar smoke-test (dev-only)
docs/                     # booking-setup.md — Google Calendar setup runbook
```

## Notes

- **ESLint is pinned to v9.** ESLint 10 is blocked by `eslint-plugin-import` / `eslint-plugin-jsx-a11y` (bundled by `eslint-config-next`), whose peers cap at `^9`. Revisit when those ship v10 support.
- The design system is **brand-agnostic** — brand specifics (logo, copy, imagery, brand components) live here, not in `@saas/ui`.
- `@saas/ui@0.2.0` ships no `"use client"`: Button/Badge/Card are server-safe; Radix-backed Dialog/Select/Toast (used once *Agenda*/*Pago* land) need a `'use client'` boundary.
