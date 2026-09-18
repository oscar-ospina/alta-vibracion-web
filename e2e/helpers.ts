import { sql } from "drizzle-orm";
import { getDb, schema } from "../db/client";

/** Clean slate: no bookings, no overrides, the seed rules. */
export async function resetAgenda() {
  const db = getDb();
  await db.execute(sql`truncate table bookings, availability_overrides`);
  await db.execute(sql`truncate table availability_rules restart identity`);
  await db.insert(schema.availabilityRules).values(
    [1, 2, 3, 4].map((weekday) => ({ weekday, time: "18:00", durationMinutes: 135 })),
  );
}

export const ADMIN_USER = process.env.ADMIN_USER || "lili";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-password";
