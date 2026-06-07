# alta-vibracion-web

The **Alta Vibración** consumer web app — the online numerology practice of **Liliana Tobón** (Spanish, Colombia). This repo is the **product surface**: it *imports* the brand-agnostic design system [`@saas/ui`](https://www.npmjs.com/package/@saas/ui) and adds the brand layer (logo, copy, imagery) on top.

> *"No es casualidad. Es vibración."*

**Status — two epics shipped, booking is next:**

- ✅ **Marketing landing MVP** ([epic #16](https://github.com/oscar-ospina/saas-planner/issues/16), closed 2026-06-07): a Home landing that explains numerology, builds trust in Liliana, and converts visitors via **WhatsApp/contact**, plus legal pages.
- ✅ **Landing visual fidelity to Figma** ([epic #35](https://github.com/oscar-ospina/saas-planner/issues/35), closed 2026-06-07): the Home sections were brought to **design fidelity** against the Figma `UI-Exercise` — hero gradient «esencia» + line-art decoration (#37), the «¿Por qué Numerología?» bleed cosmic card with line-art faces (#38), and the «¿Quién es Liliana Tobón?» accordion + floating chips (#39).
- ▶ **Next — booking & checkout** ([epic #31](https://github.com/oscar-ospina/saas-planner/issues/31)): real in-app *Agenda* (Phase 1 = booking-only via **Google Calendar**, backend in this repo's Route Handlers/Server Actions) then *Pago* (Phase 2). Spikes [#32](https://github.com/oscar-ospina/saas-planner/issues/32) (Google Calendar) + [#33](https://github.com/oscar-ospina/saas-planner/issues/33) (backend/data) come first. Until it lands, the landing routes booking intent to WhatsApp.

**Shipped:** Home (Figma-faithful hero + WhatsApp FAB, trust sections, consultations grid with per-cita *Agendar* → WhatsApp), shared shell (TopBar/Footer/skip-link), brand layer (logo/fonts/tokens), legal pages (Términos / Política de Privacidad / Contacto), SEO (sitemap/robots/OpenGraph), Vercel Web Analytics with per-CTA conversion events, es-CO formatting, and a WCAG 2.2 AA pass (3px focus ring, AA contrast, keyboard-reachable).

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
