/**
 * Seeds the weekly availability from the launch plan (section 13): Monday to
 * Thursday at 18:00 Bogotá, 135 minutes protected while sessions still run
 * two hours. Runs only on an empty table: once Liliana edits the schedule in
 * /admin/schedule, a later seed must not bring back a rule she deleted.
 */
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

const RULES = [1, 2, 3, 4].map((weekday) => ({
  weekday,
  time: "18:00",
  durationMinutes: 135,
}));

async function main() {
  const db = getDb();
  const any = await db.select({ id: schema.availabilityRules.id }).from(schema.availabilityRules).limit(1);
  if (any.length > 0) {
    console.log("rules already present, seed skipped");
    process.exit(0);
  }
  for (const rule of RULES) {
    const existing = await db
      .select({ id: schema.availabilityRules.id })
      .from(schema.availabilityRules)
      .where(
        and(
          eq(schema.availabilityRules.weekday, rule.weekday),
          eq(schema.availabilityRules.time, rule.time),
        ),
      );
    if (existing.length === 0) {
      await db.insert(schema.availabilityRules).values(rule);
      console.log(`inserted rule weekday=${rule.weekday} ${rule.time}`);
    }
  }
  console.log("seed done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
