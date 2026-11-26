"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireAdmin } from "@/lib/admin-auth-server";
import type { AdminNoticeKey } from "@/lib/agenda/labels";
import {
  clashingRules,
  datesInRange,
  extraDuration,
  isRealDate,
  validateRule,
} from "@/lib/agenda/schedule";
import { HHMM_RE, bogotaInstant, weekdayOf } from "@/lib/agenda/time";

const PATH = "/admin/schedule";

/** Every change here moves what /agenda offers, so both pages refresh. */
function done(key: AdminNoticeKey): never {
  revalidatePath(PATH);
  revalidatePath("/admin");
  revalidatePath("/agenda");
  redirect(`${PATH}?aviso=${key}`);
}

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Weekly rules.

export async function addRule(formData: FormData) {
  await requireAdmin();
  const rule = {
    weekday: Number(str(formData, "weekday")),
    time: str(formData, "time"),
    durationMinutes: Number(str(formData, "duration")),
  };
  const error = validateRule(rule);
  if (error) done(error);
  const db = getDb();
  const rules = await db.select().from(schema.availabilityRules);
  if (clashingRules(rule, rules).length > 0) done("rule_overlap");
  await db.insert(schema.availabilityRules).values({ ...rule, active: true });
  done("saved");
}

export async function setRuleActive(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id"));
  const active = str(formData, "active") === "1";
  if (!Number.isInteger(id)) done("rule_not_found");
  const db = getDb();
  const rules = await db.select().from(schema.availabilityRules);
  const rule = rules.find((r) => r.id === id);
  if (!rule) done("rule_not_found");
  // Turning a rule back on must not overlap one that is already on.
  if (active && clashingRules(rule, rules).length > 0) done("rule_overlap");
  await db.update(schema.availabilityRules).set({ active }).where(eq(schema.availabilityRules.id, id));
  done("saved");
}

export async function deleteRule(formData: FormData) {
  await requireAdmin();
  const id = Number(str(formData, "id"));
  // Bookings keep their own start and end, so removing a rule never touches them.
  if (Number.isInteger(id)) {
    await getDb().delete(schema.availabilityRules).where(eq(schema.availabilityRules.id, id));
  }
  done("saved");
}

// Vacations: one full-day `closed` override per date, grouped on the page.

export async function closeRange(formData: FormData) {
  await requireAdmin();
  const dates = datesInRange(str(formData, "from"), str(formData, "to"));
  if (!Array.isArray(dates)) done(dates);
  const note = str(formData, "note").slice(0, 200) || "Vacaciones";
  const db = getDb();
  const already = await db
    .select({ date: schema.availabilityOverrides.date })
    .from(schema.availabilityOverrides)
    .where(
      and(
        eq(schema.availabilityOverrides.kind, "closed"),
        isNull(schema.availabilityOverrides.time),
        gte(schema.availabilityOverrides.date, dates[0]),
        lte(schema.availabilityOverrides.date, dates.at(-1)!),
      ),
    );
  const closed = new Set(already.map((o) => o.date));
  const rows = dates.filter((d) => !closed.has(d)).map((date) => ({ date, kind: "closed" as const, time: null, note }));
  if (rows.length > 0) await db.insert(schema.availabilityOverrides).values(rows);
  done("saved");
}

export async function reopenRange(formData: FormData) {
  await requireAdmin();
  const ids = str(formData, "ids")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length > 0) {
    await getDb()
      .delete(schema.availabilityOverrides)
      .where(
        and(
          inArray(schema.availabilityOverrides.id, ids),
          eq(schema.availabilityOverrides.kind, "closed"),
          isNull(schema.availabilityOverrides.time),
        ),
      );
  }
  done("saved");
}

// Single-date exceptions: close one hour, or open an extra one.

export async function addOverride(formData: FormData) {
  await requireAdmin();
  const date = str(formData, "date");
  const kind = str(formData, "kind");
  const time = str(formData, "time") || null;
  const note = str(formData, "note").slice(0, 200) || null;
  if (kind !== "closed" && kind !== "extra") done("bad_date");
  if (!isRealDate(date)) done("bad_date");
  if (time && !HHMM_RE.test(time)) done("bad_time");
  if (kind === "extra" && !time) done("bad_time");
  let durationMinutes: number | null = null;
  if (kind === "extra" && time) {
    const db = getDb();
    const rules = await db.select().from(schema.availabilityRules);
    durationMinutes = extraDuration(rules);
    const start = bogotaInstant(date, time).getTime();
    const end = start + durationMinutes * 60_000;
    const sameDay = [
      ...rules.filter((r) => r.active && r.weekday === weekdayOf(date)).map((r) => ({ time: r.time, d: r.durationMinutes })),
      ...(await db.select().from(schema.availabilityOverrides).where(eq(schema.availabilityOverrides.date, date)))
        .filter((o) => o.kind === "extra" && o.time)
        .map((o) => ({ time: o.time!, d: o.durationMinutes ?? durationMinutes! })),
    ];
    const clash = sameDay.some((c) => {
      const cs = bogotaInstant(date, c.time).getTime();
      return start < cs + c.d * 60_000 && end > cs;
    });
    if (clash) done("overlap");
  }
  await getDb().insert(schema.availabilityOverrides).values({ date, kind, time, durationMinutes, note });
  done("saved");
}

export async function deleteOverride(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await getDb().delete(schema.availabilityOverrides).where(eq(schema.availabilityOverrides.id, id));
  }
  done("saved");
}
