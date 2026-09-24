# Agenda setup (Postgres)

The agenda stores availability rules, per-date exceptions and bookings in Postgres. Locally that is a Docker container; in production it is Neon, wired to Vercel.

## Local

```bash
docker run -d --name av-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=altavibracion -p 5432:5432 postgres:16
cp .env.example .env.local          # DATABASE_URL already points at the container
npm run db:migrate                  # applies drizzle/*.sql
npm run db:seed                     # Monday–Thursday 18:00, 135 min
npm run dev
```

Set `ADMIN_USER` and `ADMIN_PASSWORD` in `.env.local` to open `/admin`.

## Tests

```bash
npm run test                        # node:test against the local database
npm run build && npm run test:e2e   # Playwright, two servers from one build
```

The E2E suite and the DB tests truncate the tables they touch. Both refuse to run when `DATABASE_URL` points at a managed host (Neon, Vercel, Supabase, AWS) unless `ALLOW_DESTRUCTIVE_TESTS=1` is set. Keep them on the local container.

## Production (Neon + Vercel)

Done on 2026-09-18: Vercel team `saas-alta`, project `alta-vibracion-web`, Neon resource `neon-chestnut-marble`, migrations `0000` and `0001` applied, seed done. What follows is the record of how, for the next database or a rebuild.

### Vercel CLI login

The project lives in the Vercel team `saas-alta`, which belongs to the GitHub-linked account (`oscar-4086`). Logging in with the plain email account shows "No teams available" and `vercel integration add` fails with "Team not found". Use `vercel login` → Continue with GitHub, then `vercel link --scope saas-alta`.

### Steps

1. In Vercel, add the Neon integration from the Marketplace to this project. It creates the database and sets `DATABASE_URL` on the project. Use the pooled connection string (host ends in `-pooler`); Neon's integration sets that by default. Check the value in Project → Settings → Environment Variables. TLS comes from the `sslmode` parameter in that string; the app passes no separate SSL option.
2. Add `ADMIN_USER`, `ADMIN_PASSWORD`, `PAYMENT_BREB_KEY` (the Bre-B key clients pay to; optional `PAYMENT_BREB_HOLDER` with the name Bre-B shows) and optionally `BOOKING_HOLD_HOURS` in the same place. Without `PAYMENT_BREB_KEY` the pages say Lili sends the payment details by WhatsApp.
3. From a machine with that `DATABASE_URL` exported:

```bash
npm run db:migrate
npm run db:seed
```

4. Redeploy so the functions pick up the new variables:

```bash
vercel ls --prod                                   # copy the current production URL
vercel redeploy <that-url> --target production --non-interactive
```

Until step 1 is done, `/agenda` shows the WhatsApp fallback and nothing else changes.

### Pulling production variables

```bash
vercel env pull /tmp/prod.env --environment=production --yes
```

Pull to a scratch file, not to `.env.local`, or it replaces the local Docker `DATABASE_URL`. `ADMIN_USER` and `ADMIN_PASSWORD` are stored as sensitive, so the pulled file carries the placeholder `[SENSITIVE]` instead of the value; only the person who typed them can test `/admin`. Delete the scratch file afterwards.

### Applying a new migration to production

```bash
export DATABASE_URL="$(grep ^DATABASE_URL= /tmp/prod.env | cut -d= -f2- | tr -d '"')"
npm run db:migrate
```

`drizzle-kit migrate` only applies files not yet recorded in `drizzle.__drizzle_migrations`, so re-running it is safe.

### Day to day

Liliana opens `/admin` (Basic auth), confirms a booking after seeing the transfer, or cancels it. She closes days or adds an extra slot in the exceptions form. Confirmed sessions she copies to her own calendar by hand.

After confirming, each booking's code links to its own page. There she marks the pre-session form as received when it arrives (the form itself is external), marks the session as attended once it happened, writes the summary from the template and saves it as draft, reviewed or approved. Only the approved text appears on the client's `/agenda/<code>` page; saving it again as draft hides it. Fourteen days after the session the booking shows up under "Seguimiento del día 14" until she marks the follow-up done. `/admin/script` holds the operating script and the seven-day plan.

## Changing the schema

Edit `db/schema.ts`, then `npm run db:generate` to produce a new file under `drizzle/`, commit it, and run `npm run db:migrate` locally and against Neon.
