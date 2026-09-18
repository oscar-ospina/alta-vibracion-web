# Alta Vibración consumer-app framework

**Date:** 2026-06-06
**Status:** Decided
**Spike:** [oscar-ospina/saas-planner#17](https://github.com/oscar-ospina/saas-planner/issues/17)
**Parent epic:** [oscar-ospina/saas-planner#16](https://github.com/oscar-ospina/saas-planner/issues/16)

## Decision

**Next.js (App Router), TypeScript, static-by-default** for the Alta Vibración consumer app, starting with the marketing landing (epic #16) and carrying through the deferred booking/checkout surfaces.

Rejected: **Vite + React Router 7 (SPA)** — the wrong default for an SEO-critical marketing surface (no prerendered HTML without opting into framework-mode SSR, which converges on a meta-framework anyway, minus Next's first-party SEO primitives).

## Context

The stack ADR ([#6](2026-05-27-ds-stack-decision.md)) deliberately left the web framework unchosen and kept `@saas/ui` framework-agnostic. This spike picks it, now that the first surface is concrete: a **Spanish (Colombia) marketing landing** that must be findable (SEO/OG), fast, and accessible, and that will later grow **booking (Agenda)** + **checkout (Pago)** + a **backend** (availability API, payment gateway, webhooks, email).

### What `@saas/ui@0.2.0` actually is (verified 2026-06-06 from `saas-packages/ui/dist` + `package.json`)

- **ESM-only**, `exports["."]` → `dist/index.mjs`; `@saas/ui/theme.css` → `src/theme.css`; `@saas/ui/tokens.json` → `tokens/tokens.json`.
- **dist is lowered JS, not raw TSX** — component files import `jsx` from `react/jsx-runtime` and call `jsx(...)`; a grep for raw `<Tag>` JSX across `dist/` returns nothing. **Class strings are visible** in the dist (e.g. `cva("inline-flex … rounded-lg …")`), so Tailwind's `@source` can scan them.
- **Peer deps:** `react ^18 || ^19`, `react-dom ^18 || ^19`, `tailwindcss ^4`, **`tw-animate-css ^1.4.0`** (the last is easy to miss — the consumer must install it).
- **No `"use client"` directives ship in 0.2.0** (grep across `dist/` = 0 hits). See RSC note below.

### Verified version anchors (current docs, June 2026)

Next.js **16.2.7** (App Router stable & default; Pages Router legacy) · React **19.2** · Node **≥ 20.9** (Node 18 dropped in Next 16) · Turbopack default for `dev`+`build` · Tailwind CSS **v4.3** · React Router **v7.16.0**.

> Next 16 ships React 19.2 (satisfies `react ^18||^19`) and pairs with Tailwind 4.3 (satisfies `tailwindcss ^4`) — `@saas/ui`'s peers are met by the default stack.

## Comparison

| Criterion | Next.js App Router | Vite + React Router 7 (SPA) |
|---|---|---|
| **SEO / prerendered HTML** | **Static-by-default** prerender; bots get full HTML | CSR by default → empty shell to bots; needs framework-mode SSR to fix |
| **SEO primitives** | First-party `metadata`/`generateMetadata`, `sitemap.ts`, `robots.ts`, OG/Twitter, `metadataBase` | Hand-rolled or library; no first-party convention |
| **Font self-hosting** | `next/font/google` — build-time self-host, zero layout shift, no Google requests | `@fontsource` or manual `@font-face` |
| **`@saas/ui` consumption** | Clean: `@source` (relative path) + `@import "@saas/ui/theme.css"`; lowered-JS dist ⇒ no transpile step | `@tailwindcss/vite` plugin; same `@source`/import model |
| **Future backend** | Route Handlers / Server Actions — natural path for availability API + payment webhooks | Needs a separate server (or RR7 framework mode) |
| **RSC boundary** | Server-by-default; push interactivity into client components | N/A (all client) |
| **Tailwind v4 plugin** | `@tailwindcss/postcss` | `@tailwindcss/vite` |

## Rationale

1. **SEO is the gating requirement.** A marketing landing exists to be found and to convert. Next App Router prerenders static pages by default and ships first-party `metadata`/`sitemap`/`robots`/OpenGraph — exactly the surface a plain SPA lacks. React Router 7 *can* SSR in framework mode, but that reintroduces a meta-framework + server runtime while giving up Next's mature SEO conventions and `next/font` self-hosting.
2. **Clean future full-stack path.** The deferred booking/checkout epic needs availability endpoints and payment webhooks. Next Route Handlers / Server Actions give a first-party path, clarifying (and possibly deferring) the `api/` sibling rather than forcing it on day one.
3. **`@saas/ui` drops in cleanly.** Verified: lowered-JS ESM dist with visible class strings → no `transpilePackages` needed for syntax, and `@source` scanning works. React 19.2 + Tailwind 4.3 satisfy the peers out of the box.

## Wiring (consumer recipe — grounded in current docs, validate in story #19)

Install: `next react react-dom`, `tailwindcss @tailwindcss/postcss`, `tw-animate-css` (peer of `@saas/ui`), `@saas/ui`.

`postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`app/globals.css`:
```css
@import "tailwindcss";
@import "@saas/ui/theme.css";          /* tokens + semantic role layer */
@source "../node_modules/@saas/ui";    /* scan the lib's class strings (relative path) */
/* tw-animate-css is a @saas/ui peer — import if a primitive's animations need it */
@theme inline {                         /* map self-hosted fonts to DS font roles */
  --font-display: var(--font-archivo);
  --font-sans: var(--font-open-sans);
}
```

`app/layout.tsx`: `next/font/google` for `Archivo` (→ `--font-archivo`) + `Open_Sans` (→ `--font-open-sans`), both classNames on `<html lang="es-CO">`; import `./globals.css`. Add the `metadata` object (with `metadataBase` + `openGraph.locale: 'es_CO'`), plus `app/sitemap.ts` and `app/robots.ts`.

## Risks & caveats (verify empirically in the scaffold story #19)

1. **`@source` path resolution.** Tailwind v4 docs show **relative-path** `@source` only; bare-package `@source "@saas/ui"` is **not documented** and [tailwindlabs/tailwindcss#19040](https://github.com/tailwindlabs/tailwindcss/issues/19040) reports node_modules scanning friction. Use the relative path and confirm the generated CSS includes `@saas/ui`'s utilities. (Note: `@import "@saas/ui/theme.css"` is normal CSS import resolution and is unaffected.)
2. **⚠️ No `"use client"` in `@saas/ui@0.2.0`.** Server-safe primitives (Button = Slot + cva, Badge, Card) import fine into Server Components — good for the **static Home**, which only uses those. But client-stateful Radix primitives (**Dialog, Select, Toast**, used later in **Agenda/Pago**) will error if imported directly into a Server Component; they must sit behind a consumer **`'use client'`** boundary. **Follow-up improvement** (saas-packages story, when booking/checkout lands): add `"use client"` to `@saas/ui`'s client entry points so consumers don't need wrappers. *Not blocking the marketing MVP.*
3. **`transpilePackages`** is **not** required today (dist is lowered JS). If a future `@saas/ui` build ever ships raw TSX, add `transpilePackages: ['@saas/ui']` to `next.config`.
4. **`@theme inline` font mapping** is the established `next/font` + Tailwind v4 pattern; confirm the exact syntax against the installed Tailwind 4.3.
5. Prefer **deep imports** (`@saas/ui/button`) over a mega-barrel where available, to keep RSC server/client boundaries clean (Next discussion [#65979](https://github.com/vercel/next.js/discussions/65979)).

## Consequences

- Scopes story [#19](https://github.com/oscar-ospina/saas-planner/issues/19) (scaffold): Next.js + TS + Tailwind v4 (`@tailwindcss/postcss`) + the wiring above + `tw-animate-css`, rendering a `@saas/ui` Button end-to-end with CI green.
- Informs story [#21](https://github.com/oscar-ospina/saas-planner/issues/21) (app shell — App Router routing/layout) and [#22](https://github.com/oscar-ospina/saas-planner/issues/22) (SEO/metadata/sitemap, `lang="es-CO"`, `next/font`).
- Flags a **future saas-packages story**: add `"use client"` directives to `@saas/ui` client entries (caveat #2).

## References

- Next.js App Router / CSS / fonts / metadata — <https://nextjs.org/docs/app> · <https://nextjs.org/docs/app/getting-started/css> · <https://nextjs.org/docs/app/getting-started/fonts> · <https://nextjs.org/docs/app/api-reference/functions/generate-metadata>
- `transpilePackages` — <https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages>
- `use client` for component libraries — <https://nextjs.org/docs/app/api-reference/directives/use-client>
- Tailwind v4 source detection / `@source` — <https://tailwindcss.com/docs/detecting-classes-in-source-files> · issue <https://github.com/tailwindlabs/tailwindcss/issues/19040>
- React Router v7 modes — <https://reactrouter.com/start/modes>
- Stack ADR — [`2026-05-27-ds-stack-decision.md`](2026-05-27-ds-stack-decision.md)
