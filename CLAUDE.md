@AGENTS.md

# alta-vibracion-web

Consumer site for Liliana Tobón's numerology practice (Alta Vibración, es-CO). Next.js 16 App Router, TypeScript, Tailwind v4, `@saas/ui` design system, Vercel. Code and routes in English, user-facing copy in Spanish.

The October plan lives outside the repo at `../Alta_Vibracion_729_Plan_Ejecucion_2309.md` (V2.1; section 8 is the web structure, section 12 the delivery order, section 13 the acceptance tests). Decisions are recorded in `docs/adr/`; superseded ones in `docs/archive/adr/`. The Match demo is a separate repo (`alta-code`) and is never wired into this site.

## Invariants

- `@saas/ui` stays brand-agnostic. Brand assets, copy and compositions live here, never in the design system.
- Only a service with `status: "active"` in `lib/catalog.ts` sells. `createBooking` enforces it; a future service never shows a price, a calendar or a payment step. The gift is `allowsGift` on YO-01, not a service. New public routes keep the plan's Spanish slugs (`/yo`, `/regalar`, `/encuentros`); see `docs/adr/2026-09-23-plan-v21.md`.
- The agenda's double-booking guard is the partial unique index `bookings_active_slot_idx` on `bookings.starts_at`. Do not replace it with application checks.
- A campaign price reaches a booking only through `createBooking` with a campaign code: campaign active, contact registered for it, promo cupo free (counted inside the transaction under a row lock). Activation is a manual admin action; `expired` and `sold_out` are derived in `viewOf`, never stored. `bookings.price_cop` is frozen; nothing rewrites it.
- Every mutating server action verifies admin credentials itself (`requireAdmin` in `lib/admin-auth-server.ts`). `proxy.ts` only challenges page loads.
- A booking becomes `confirmed` only through the admin action, after Liliana verifies the transfer by hand, or by redeeming a gift voucher whose order she already marked paid (the money was verified on the order). Attended, form-received and follow-up marks are nullable instants on `bookings`, never new `booking_status` values (the guard's predicate depends on them). An attended booking cannot be cancelled.
- No personal data in URLs, analytics events, logs or fixtures. Bookings and interests store a preferred name and one contact channel, normalized through `lib/contact.ts` (never infer a country code); an interest is never a sale, and a repeated form updates the open row (partial unique index `interests_open_idx`). A form never shows a success the server did not save. `reports` holds Liliana's session summary, shown to the client only once `approved` (`docs/adr/2026-09-18-delivery-in-admin.md`). The pre-session form stays outside the app until the legal texts are signed off.
- Without `DATABASE_URL` the build must pass and `/agenda` must render the WhatsApp fallback. Never show simulated availability.
- A gift is sold once, on `gift_orders`; the beneficiary's booking redeems the voucher (price 0, confirmed on creation) and is never a sale. The partial unique index `bookings_gift_order_idx` is the single-use guard; `redeemGiftInTx` re-checks the order under a row lock. The order never stores the beneficiary's data.
- Payment details come from `PAYMENT_BREB_KEY` (server-only, `lib/payment.ts`): a Bre-B key, never a bank account number in code or pages. A manual booking from the admin (`createManualBooking`) skips the public rules but never the double-booking guard.
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
