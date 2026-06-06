@AGENTS.md

# alta-vibracion-web — working notes for Claude

The **Alta Vibración** consumer web app (the product surface for Liliana Tobón's numerology practice, ES-CO). It *imports* the brand-agnostic `@saas/ui` design system and adds the brand layer here.

## Planning lives elsewhere

Stories, epics, ADRs, and the board are in **[`saas-planner`](https://github.com/oscar-ospina/saas-planner)** (GitHub Issues/Projects v2, `gh` CLI). This repo is **code only**. Reference the planner issue in commits/PRs:

```
feat: <summary> (oscar-ospina/saas-planner#<n>)
# PR body: Closes oscar-ospina/saas-planner#<n>
```

Current epic: **[#16](https://github.com/oscar-ospina/saas-planner/issues/16)** — marketing landing MVP.

## Stack & conventions

- **Next.js 16 App Router + TypeScript + Tailwind v4 + `@saas/ui`** (see [README](README.md)). Default branch `main`; CI = lint + typecheck + build on push/PR.
- **Design system:** import primitives from `@saas/ui`; add only brand specifics (logo, copy, imagery, brand compositions) here — don't fork brand values into the DS. Wiring per [ADR #17](https://github.com/oscar-ospina/saas-planner/blob/main/docs/superpowers/specs/2026-06-06-av-app-framework.md): `app/globals.css` already does `@import "@saas/ui/theme.css"` + `@source "../node_modules/@saas/ui"`; `next/font` supplies `--font-archivo` / `--font-open-sans` (the variable names the DS theme expects — don't rename them).
- **Light-only** — the DS has no dark palette (deferred).
- **RSC:** `@saas/ui@0.2.0` ships no `"use client"`. Button/Badge/Card are server-safe; Radix-backed Dialog/Select/Toast need a `'use client'` boundary in the consumer.
- **⚠️ ESLint is pinned to `^9`** — do **not** bump to 10. `eslint-config-next`'s bundled `eslint-plugin-import` / `eslint-plugin-jsx-a11y` cap at eslint `^9`; bumping breaks `npm run lint`.
- Dual-use / brand-agnostic test for any change: the DS must stay re-themeable; brand-locked content belongs in this repo.

## Brand (Alta Vibración)

Orange `#f37d3e` + violet `#7f5af8`, Archivo + Open Sans, cosmic/warm, generous rounding. Tagline *"No es casualidad. Es vibración."* The palette + type come from `@saas/ui`'s shipped theme (AV is the DS's reference brand); brand-specific assets (logo SVGs) and copy live here. Design reference: the Claude Design bundle (clickable Home → Agenda → Pago UI kits + brand guide) — see the planner's `CLAUDE.md → Claude Design access`.
