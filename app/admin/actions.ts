"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireAdmin } from "@/lib/admin-auth-server";
import { setBookingStatus } from "@/lib/agenda/bookings";
import { HHMM_RE, ISO_DATE_RE, addDays, bogotaInstant, weekdayOf } from "@/lib/agenda/time";
import type { AdminNoticeKey } from "@/lib/agenda/labels";

function notify(key: AdminNoticeKey): never {
  redirect(`/admin?aviso=${key}`);
}

async function transition(formData: FormData, status: "confirmed" | "cancelled") {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const res = id ? await setBookingStatus(id, status) : ({ ok: false, error: "not_found" } as const);
  revalidatePath("/admin");
  if (!res.ok) notify(res.error);
  redirect("/admin");
}

export async function confirmBooking(formData: FormData) {
  await transition(formData, "confirmed");
}

export async function cancelBooking(formData: FormData) {
  await transition(formData, "cancelled");
}

export async function addOverride(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const timeRaw = String(formData.get("time") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (kind !== "closed" && kind !== "extra") notify("bad_date");
  // A real calendar date, not just the shape (2026-02-31 passes the regex).
  if (!ISO_DATE_RE.test(date) || addDays(date, 0) !== date) notify("bad_date");
  const time = timeRaw ? timeRaw : null;
  if (time && !HHMM_RE.test(time)) notify("bad_time");
  if (kind === "extra" && !time) notify("bad_time");
  let durationMinutes: number | null = null;
  if (kind === "extra" && time) {
    // Same length as the regular slots, so an extra morning protects the same time.
    const db = getDb();
    const rules = await db.select().from(schema.availabilityRules);
    durationMinutes = rules[0]?.durationMinutes ?? 135;
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
    if (clash) notify("overlap");
  }
  await getDb().insert(schema.availabilityOverrides).values({ date, kind, time, durationMinutes, note });
  revalidatePath("/admin");
  revalidatePath("/agenda");
  notify("saved");
}

export async function deleteOverride(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) {
    await getDb()
      .delete(schema.availabilityOverrides)
      .where(eq(schema.availabilityOverrides.id, id));
  }
  revalidatePath("/admin");
  revalidatePath("/agenda");
}
