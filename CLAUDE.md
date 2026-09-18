@AGENTS.md

# alta-vibracion-web

Consumer site for Liliana Tobón's numerology practice (Alta Vibración, es-CO). Next.js 16 App Router, TypeScript, Tailwind v4, `@saas/ui` design system, Vercel. Code and routes in English, user-facing copy in Spanish.

The launch plan lives outside the repo at `../Alta_Vibracion_729_Plan_Ejecucion_V1.md` (section 11 is the dev brief). Decisions are recorded in `docs/adr/`; superseded ones in `docs/archive/adr/`. The Match demo is a separate repo (`alta-code`) and is never wired into this site.

## Invariants

- `@saas/ui` stays brand-agnostic. Brand assets, copy and compositions live here, never in the design system.
- No personal data in URLs, analytics events, logs or fixtures.
- Legal copy in `content/terms.md` and `content/privacy.md` is a draft with `[POR CONFIRMAR]` markers. Do not remove the draft banner until Liliana signs off.

## Gotchas that cost time

- Tailwind v4 in this consumer: `group-open:` compiles to nothing, use `[[open]_&]:`. `rotate-*` sets the CSS `rotate` property, so transition it with `transition-[rotate]`. Gradient text goes through `.text-gradient-brand` in `app/brand.css`. For bleed-image cards override the DS `Card` with `rounded-[2rem] border-0 p-0`.
- Turbopack dev can serve stale CSS. Verify visual changes against `npm run build && npm run start`, not HMR.
- `@saas/ui` Button's focus ring does not render here; `app/brand.css` adds an outline rule. Keep it.
- `@saas/ui@0.2.0` ships no `"use client"`. Radix-backed Select/Dialog need a client boundary in this repo.
- ESLint stays on `^9`; `eslint-config-next`'s plugins cap there.
- Next 16 renamed middleware to `proxy.ts`. Read `node_modules/next/dist/docs/` before touching routing, caching or server actions.

## Verify before merging

`npm run lint && npm run typecheck && npm run build`. PRs auto-merge after green CI and a clean review.
