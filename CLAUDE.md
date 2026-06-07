@AGENTS.md

# alta-vibracion-web — working notes for Claude

The **Alta Vibración** consumer web app (the product surface for Liliana Tobón's numerology practice, ES-CO). It *imports* the brand-agnostic `@saas/ui` design system and adds the brand layer here.

## Planning lives elsewhere

Stories, epics, ADRs, and the board are in **[`saas-planner`](https://github.com/oscar-ospina/saas-planner)** (GitHub Issues/Projects v2, `gh` CLI). This repo is **code only**. Reference the planner issue in commits/PRs:

```
feat: <summary> (oscar-ospina/saas-planner#<n>)
# PR body: Closes oscar-ospina/saas-planner#<n>
```

Epics so far (both closed): **[#16](https://github.com/oscar-ospina/saas-planner/issues/16)** marketing landing MVP (stories #17–#26) and **[#35](https://github.com/oscar-ospina/saas-planner/issues/35)** landing visual fidelity to Figma (stories #36–#39 — hero gradient/decoration, why-numerology bleed card + line-art, about-liliana accordion + chips). **▶ Active next: [#31](https://github.com/oscar-ospina/saas-planner/issues/31) booking & checkout** — Phase 1 = booking-only via **Google Calendar**, backend = Route Handlers/Server Actions **in this repo** (no `api/` sibling yet); run spikes [#32](https://github.com/oscar-ospina/saas-planner/issues/32) (Google Calendar) + [#33](https://github.com/oscar-ospina/saas-planner/issues/33) (backend/data) first. See [README → status](README.md) for shipped features + the pre-launch checklist.

## Gotchas worth knowing (from building the MVP)

- **Legal copy is a BORRADOR.** `content/{terms,privacy}.md` still carry 14 `[POR CONFIRMAR: …]` placeholders + a `<DraftNotice>` banner; they must be filled and legally reviewed before public launch (Ley 1581 / Habeas Data). Contact page channels are real (from `lib/site.ts`).
- **Legal content pipeline:** copy lives as Markdown in `content/*.md`, read at **build time** via `lib/legal.ts` (`readLegalDoc`, fs) and rendered with `react-markdown` in `components/sections/prose.tsx`. The pages stay statically prerendered, so there's no runtime fs; raw HTML is left disabled (the .md is trusted, in-repo).
- **Production host is env-driven.** `NEXT_PUBLIC_SITE_URL` (default `https://altavibracion.resuelv.com`) drives `metadataBase`/sitemap/robots — set the real `resuelv.com` subdomain in Vercel at deploy; no code change needed.
- **Focus ring:** `app/brand.css` has an unlayered `[data-slot="button"]:focus-visible` outline rule — a deliberate consumer compensation because the `@saas/ui` Button's own box-shadow focus ring does **not** render in this Tailwind v4 build (DS bug, [planner #30](https://github.com/oscar-ospina/saas-planner/issues/30)). Keep it until #30 lands. Other interactive elements use `focus-visible:outline-[3px] outline-ring` directly.
- **Tailwind v4 quirks (learned in the fidelity epic #35):**
  - `group-open:` is **not** a working variant in this consumer (it compiles to nothing). For a `<details>` accordion chevron, target the open ancestor directly: `[[open]_&]:rotate-90`. And v4 `rotate-*` sets the CSS **`rotate:`** property (not `transform`), so animate it with `transition-[rotate]`, **not** `transition-transform`.
  - **Gradient text:** use the `.text-gradient-brand` class in `brand.css` (clips `--grad-text` to the glyphs + a `@supports` solid-color fallback) rather than inline `bg-clip-text text-transparent`. (Tailwind v4 *does* emit the `-webkit-background-clip` alias here, so the inline form isn't invisible on modern browsers — the fallback is for the pre-prefix tail + the AC; don't conflate this with the genuine #30 box-shadow non-render.)
  - **Bleed-image cards:** the DS `Card` defaults to `rounded-2xl border py-6`; for a flush bleed image override with `rounded-[2rem] border-0 p-0` and pad the content cell instead. Useful exact matches: `bg-card` = `#ffffff`, `text-foreground` = `#363744` (the Figma card + body colors).
- **⚠️ Turbopack dev HMR can serve STALE CSS** for class changes — a new arbitrary utility/variant may not appear until a full rebuild, so a `getComputedStyle` probe can falsely read "none". **Verify visual/CSS changes against a fresh build** (`rm -rf .next && npm run dev`, or `npm run build && npm run start`), not dev HMR. Verification harness used across #35: headless Playwright from the global npx cache — `NODE_PATH=~/.npm/_npx/<hash>/node_modules node script.js` against the server on a fixed port.
- **CTA conversion tracking** goes through the `BookingButton` client island (+ the FAB) → `track("book_consultation", { source })`; keep new WhatsApp CTAs on that path so they're attributed.

## Stack & conventions

- **Next.js 16 App Router + TypeScript + Tailwind v4 + `@saas/ui`** (see [README](README.md)). Default branch `main`; CI = lint + typecheck + build on push/PR.
- **Design system:** import primitives from `@saas/ui`; add only brand specifics (logo, copy, imagery, brand compositions) here — don't fork brand values into the DS. Wiring per [ADR #17](https://github.com/oscar-ospina/saas-planner/blob/main/docs/superpowers/specs/2026-06-06-av-app-framework.md): `app/globals.css` already does `@import "@saas/ui/theme.css"` + `@source "../node_modules/@saas/ui"`; `next/font` supplies `--font-archivo` / `--font-open-sans` (the variable names the DS theme expects — don't rename them).
- **Light-only** — the DS has no dark palette (deferred).
- **RSC:** `@saas/ui@0.2.0` ships no `"use client"`. Button/Badge/Card are server-safe; Radix-backed Dialog/Select/Toast need a `'use client'` boundary in the consumer.
- **⚠️ ESLint is pinned to `^9`** — do **not** bump to 10. `eslint-config-next`'s bundled `eslint-plugin-import` / `eslint-plugin-jsx-a11y` cap at eslint `^9`; bumping breaks `npm run lint`.
- Dual-use / brand-agnostic test for any change: the DS must stay re-themeable; brand-locked content belongs in this repo.

## Brand (Alta Vibración)

Orange `#f37d3e` + violet `#7f5af8`, Archivo + Open Sans, cosmic/warm, generous rounding. Tagline *"No es casualidad. Es vibración."* The palette + type come from `@saas/ui`'s shipped theme (AV is the DS's reference brand); brand-specific assets (logo SVGs) and copy live here. Design reference: the Claude Design bundle (clickable Home → Agenda → Pago UI kits + brand guide) — see the planner's `CLAUDE.md → Claude Design access`.
