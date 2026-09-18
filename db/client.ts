/**
 * Lazy Postgres connection. Nothing connects at import time, so the site builds
 * and serves every static page without DATABASE_URL; only the agenda needs it.
 * One `pg` Pool works against the local Docker container and against Neon's
 * pooled connection string in Vercel functions.
 */
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

let db: Db | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Db {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url,
    max: 3,
    // Neon requires TLS; the local container does not offer it.
    ssl: /neon\.tech|sslmode=require/.test(url)
      ? { rejectUnauthorized: true }
      : undefined,
  });
  db = drizzle(pool, { schema });
  return db;
}

export { schema };
