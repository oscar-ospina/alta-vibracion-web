# alta-vibracion-web

The **Alta Vibración** consumer web app — the online numerology practice of **Liliana Tobón** (Spanish, Colombia). This repo is the **product surface**: it *imports* the brand-agnostic design system [`@saas/ui`](https://www.npmjs.com/package/@saas/ui) and adds the brand layer (logo, copy, imagery) on top.

> *"No es casualidad. Es vibración."*

**Current scope — marketing landing MVP** ([epic #16](https://github.com/oscar-ospina/saas-planner/issues/16)): a Home landing that explains numerology, builds trust in Liliana, and converts visitors via **WhatsApp/contact**. Real in-app booking (*Agenda*) and checkout (*Pago*) plus their backend are a deferred follow-up; the MVP routes booking intent to WhatsApp.

Planning, stories, and architecture decisions live in the [`saas-planner`](https://github.com/oscar-ospina/saas-planner) repo (GitHub Issues/Projects).

## Stack

- **Next.js 16** (App Router) · **TypeScript** · **React 19**
- **Tailwind v4** (`@tailwindcss/postcss`) + **`@saas/ui`** design system (+ `tw-animate-css` peer)
- **`next/font`** self-hosts **Archivo** (display) + **Open Sans** (body), wired to the DS font roles
- es-CO content · **light-only** (the DS ships no dark palette)

The `@saas/ui` wiring follows [ADR #17](https://github.com/oscar-ospina/saas-planner/blob/main/docs/superpowers/specs/2026-06-06-av-app-framework.md): `@import "@saas/ui/theme.css"` + `@source` in `app/globals.css`, fonts supplied via `next/font`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # next build (static-by-default; marketing pages prerender)
npm run start      # serve the production build
npm run lint       # eslint (flat config)
npm run typecheck  # tsc --noEmit
```

Requires **Node ≥ 20.9** (Next 16). CI (`.github/workflows/ci.yml`) runs lint + typecheck + build on every push and PR.

## Layout

```
app/
├── layout.tsx     # root layout — next/font (Archivo + Open Sans), es-CO metadata/OG
├── page.tsx       # Home (currently a scaffold demo rendering @saas/ui)
└── globals.css    # @import "tailwindcss" + "@saas/ui/theme.css" + @source
```

## Notes

- **ESLint is pinned to v9.** ESLint 10 is blocked by `eslint-plugin-import` / `eslint-plugin-jsx-a11y` (bundled by `eslint-config-next`), whose peers cap at `^9`. Revisit when those ship v10 support.
- The design system is **brand-agnostic** — brand specifics (logo, copy, imagery, brand components) live here, not in `@saas/ui`.
- `@saas/ui@0.2.0` ships no `"use client"`: Button/Badge/Card are server-safe; Radix-backed Dialog/Select/Toast (used once *Agenda*/*Pago* land) need a `'use client'` boundary.
