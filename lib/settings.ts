/**
 * Operating switches (plan section 12, row 6). Stored in the `settings`
 * table so Liliana changes them from the admin without a deploy. Read on
 * every request of the pages that depend on them; there are one or two keys.
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";

export const BOOKINGS_PAUSED = "bookings_paused";

/** True when Liliana paused public bookings: /agenda shows the manual path. */
export async function bookingsPaused(): Promise<boolean> {
  const [row] = await getDb()
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, BOOKINGS_PAUSED))
    .limit(1);
  return row?.value === "1";
}

export async function setBookingsPaused(paused: boolean, now: Date = new Date()): Promise<void> {
  await getDb()
    .insert(schema.settings)
    .values({ key: BOOKINGS_PAUSED, value: paused ? "1" : "0", updatedAt: now })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: paused ? "1" : "0", updatedAt: now } });
}
