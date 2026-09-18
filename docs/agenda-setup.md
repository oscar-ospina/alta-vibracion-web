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

The E2E suite truncates the tables it touches. Point `DATABASE_URL` at a throwaway database, never at production.

## Production (Neon + Vercel), once

1. In Vercel, add the Neon integration from the Marketplace to this project. It creates the database and sets `DATABASE_URL` on the project. Use the pooled connection string (host ends in `-pooler`); Neon's integration sets that by default. Check the value in Project → Settings → Environment Variables.
2. Add `ADMIN_USER`, `ADMIN_PASSWORD` and optionally `BOOKING_HOLD_HOURS` in the same place.
3. From a machine with that `DATABASE_URL` exported:

```bash
npm run db:migrate
npm run db:seed
```

4. Redeploy. Until step 1 is done, `/agenda` shows the WhatsApp fallback and nothing else changes.

## Changing the schema

Edit `db/schema.ts`, then `npm run db:generate` to produce a new file under `drizzle/`, commit it, and run `npm run db:migrate` locally and against Neon.
