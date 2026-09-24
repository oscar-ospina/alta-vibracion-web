/**
 * Shared setup for the database tests. One reset for every file, so a new
 * table is added to the truncate list once. The E2E suite has its own copy in
 * e2e/helpers.ts because Playwright loads it in another process.
 */
import { sql } from "drizzle-orm";
import { getDb, schema } from "../../db/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests/db");
}

/** Never truncate a managed database by accident. */
export function assertDisposableDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (/neon\.tech|vercel|supabase|amazonaws/i.test(url) && process.env.ALLOW_DESTRUCTIVE_TESTS !== "1") {
    throw new Error("Refusing to truncate a managed database. Point DATABASE_URL at a local container.");
  }
}

/** Clean slate: every table empty, the seed rules (Monday to Thursday 18:00, 135 min). */
export async function resetAgenda() {
  assertDisposableDatabase();
  const db = getDb();
  await db.execute(sql`truncate table interests, reports, bookings, availability_overrides`);
  await db.execute(sql`truncate table availability_rules restart identity`);
  await db.insert(schema.availabilityRules).values(
    [1, 2, 3, 4].map((weekday) => ({ weekday, time: "18:00", durationMinutes: 135 })),
  );
}
