import { sql } from "drizzle-orm";
import { getDb, schema } from "../db/client";


/** Never truncate a managed database by accident. */
function assertDisposableDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (/neon\.tech|vercel|supabase|amazonaws/i.test(url) && process.env.ALLOW_DESTRUCTIVE_TESTS !== "1") {
    throw new Error("Refusing to truncate a managed database. Point DATABASE_URL at a local container.");
  }
}

/** Clean slate: no bookings, no overrides, the seed rules. */
export async function resetAgenda() {
  assertDisposableDatabase();
  const db = getDb();
  await db.execute(sql`truncate table bookings, availability_overrides`);
  await db.execute(sql`truncate table availability_rules restart identity`);
  await db.insert(schema.availabilityRules).values(
    [1, 2, 3, 4].map((weekday) => ({ weekday, time: "18:00", durationMinutes: 135 })),
  );
}

export const ADMIN_USER = process.env.ADMIN_USER || "lili";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-password";
