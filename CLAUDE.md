@AGENTS.md

# alta-vibracion-web

Consumer site for Liliana Tobón's numerology practice (Alta Vibración, es-CO). Next.js 16 App Router, TypeScript, Tailwind v4, `@saas/ui` design system, Vercel. Code and routes in English, user-facing copy in Spanish.

The launch plan lives outside the repo at `../Alta_Vibracion_729_Plan_Ejecucion_V1.md` (section 11 is the dev brief). Decisions are recorded in `docs/adr/`; superseded ones in `docs/archive/adr/`. The Match demo is a separate repo (`alta-code`) and is never wired into this site.

## Invariants

- `@saas/ui` stays brand-agnostic. Brand assets, copy and compositions live here, never in the design system.
- The agenda's double-booking guard is the partial unique index `bookings_active_slot_idx` on `bookings.starts_at`. Do not replace it with application checks.
- Every mutating server action verifies admin credentials itself (`requireAdmin` in `lib/admin-auth-server.ts`). `proxy.ts` only challenges page loads.
- A booking becomes `confirmed` only through the admin action, after Liliana verifies the transfer by hand. Attended, form-received and follow-up marks are nullable instants on `bookings`, never new `booking_status` values (the guard's predicate depends on them). An attended booking cannot be cancelled.
- No personal data in URLs, analytics events, logs or fixtures. Bookings store a preferred name and one contact channel; `reports` holds Liliana's session summary, shown to the client only once `approved` (`docs/adr/2026-09-18-delivery-in-admin.md`). The pre-session form stays outside the app until the legal texts are signed off.
- Without `DATABASE_URL` the build must pass and `/agenda` must render the WhatsApp fallback. Never show simulated availability.
- Legal copy in `content/terms.md` and `content/privacy.md` is a draft with `[POR CONFIRMAR]` markers. Do not remove the draft banner until Liliana signs off.

## Gotchas that cost time

- Tailwind v4 in this consumer: `group-open:` compiles to nothing, use `[[open]_&]:`. `rotate-*` sets the CSS `rotate` property, so transition it with `transition-[rotate]`. Gradient text goes through `.text-gradient-brand` in `app/brand.css`. For bleed-image cards override the DS `Card` with `rounded-[2rem] border-0 p-0`.
- Turbopack dev can serve stale CSS. Verify visual changes against `npm run build && npm run start`, not HMR.
- `@saas/ui` Button's focus ring does not render here; `app/brand.css` adds an outline rule. Keep it.
- `@saas/ui@0.2.0` ships no `"use client"`. Radix-backed Select/Dialog need a client boundary in this repo.
- ESLint stays on `^9`; `eslint-config-next`'s plugins cap there.
- Next 16 renamed middleware to `proxy.ts`. Read `node_modules/next/dist/docs/` before touching routing, caching or server actions.
- Vercel: team `saas-alta`, CLI login must be the GitHub account. `vercel redeploy <url> --target production --non-interactive` applies new env vars. `ADMIN_*` are sensitive vars; `vercel env pull` writes `[SENSITIVE]`. Pull production env to a scratch file, never `.env.local`.
- `npm run test` runs the DB test files one at a time (`--test-concurrency=1`); they share one database and each truncates it.
- Drizzle wraps driver errors; the SQLSTATE is on `err.cause` (see `unwrapPgError` in `lib/agenda/bookings.ts`). Stop local `next start` with `fuser -k <port>/tcp`; `pkill -f "next start"` kills the calling shell.

## Verify before merging

`npm run lint && npm run typecheck`, then `npm run test` (node:test against Postgres), `npm run build`, and `npm run test:e2e` (Playwright, two servers from the build: with and without `DATABASE_URL`). `docs/agenda-setup.md` has the local container and the Neon steps. CI runs the same sequence. PRs auto-merge after green CI and a clean review.
