"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireAdmin } from "@/lib/admin-auth-server";
import { setBookingStatus } from "@/lib/agenda/bookings";
import { markAttended, markFollowUpDone, markIntakeReceived, saveReport } from "@/lib/agenda/delivery";
import { setInterestStatus } from "@/lib/interests";
import { activateCampaign, closeCampaign, createCampaign } from "@/lib/campaigns";
import { HHMM_RE, ISO_DATE_RE, addDays, bogotaInstant, weekdayOf } from "@/lib/agenda/time";
import type { AdminNoticeKey } from "@/lib/agenda/labels";

function notify(key: AdminNoticeKey): never {
  redirect(`/admin?aviso=${key}`);
}

/** Same idea for the per-booking page; a bad id falls back to the list. */
function notifyBooking(id: string, key: AdminNoticeKey): never {
  revalidatePath("/admin");
  if (!id) redirect(`/admin?aviso=${key}`);
  revalidatePath(`/admin/bookings/${id}`);
  redirect(`/admin/bookings/${id}?aviso=${key}`);
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

// Delivery marks and the report (lib/agenda/delivery.ts).

export async function setIntakeReceived(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const received = String(formData.get("received") ?? "") === "1";
  const res = id ? await markIntakeReceived(id, received) : ({ ok: false, error: "not_found" } as const);
  notifyBooking(id, res.ok ? "saved" : res.error);
}

export async function setAttended(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const res = id ? await markAttended(id) : ({ ok: false, error: "not_found" } as const);
  notifyBooking(id, res.ok ? "saved" : res.error);
}

export async function setFollowUpDone(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const res = id ? await markFollowUpDone(id) : ({ ok: false, error: "not_found" } as const);
  notifyBooking(id, res.ok ? "saved" : res.error);
}

export async function submitReport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const body = String(formData.get("body") ?? "").slice(0, 20_000);
  if (status !== "draft" && status !== "reviewed" && status !== "approved") notifyBooking(id, "bad_status");
  const res = id ? await saveReport(id, { body, status }) : ({ ok: false, error: "not_found" } as const);
  notifyBooking(id, res.ok ? "saved" : res.error);
}

// Interests (lib/interests.ts): the three lists under /admin/interests.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markInterest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "contacted" && status !== "closed") redirect("/admin/interests?aviso=interest_bad_status");
  const res = UUID_RE.test(id) ? await setInterestStatus(id, status) : ({ ok: false, error: "not_found" } as const);
  revalidatePath("/admin/interests");
  redirect(`/admin/interests?aviso=${res.ok ? "saved" : "interest_not_found"}`);
}

// Campaigns (lib/campaigns.ts): /admin/campaigns.

function notifyCampaigns(key: AdminNoticeKey): never {
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns?aviso=${key}`);
}

export async function createCampaignAction(formData: FormData) {
  await requireAdmin();
  const res = await createCampaign({
    name: String(formData.get("name") ?? "").slice(0, 120),
    priceCop: Number(formData.get("priceCop")),
    threshold: Number(formData.get("threshold")),
    capacity: Number(formData.get("capacity")),
    allowsGift: formData.get("allowsGift") === "on",
    conditions: String(formData.get("conditions") ?? "").slice(0, 4000),
  });
  notifyCampaigns(res.ok ? "saved" : "campaign_bad_values");
}

export async function activateCampaignAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) notifyCampaigns("campaign_not_found");
  // datetime-local has no zone; Liliana types Colombia time.
  const raw = String(formData.get("closesAt") ?? "").trim();
  let closesAt: Date | null = null;
  if (raw) {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    // A real calendar date, not just the shape (2026-13-01 and 2026-11-31 pass the regex).
    if (!m || !ISO_DATE_RE.test(m[1]) || addDays(m[1], 0) !== m[1] || !HHMM_RE.test(m[2])) {
      notifyCampaigns("campaign_bad_window");
    }
    closesAt = bogotaInstant(m![1], m![2]);
    if (Number.isNaN(closesAt.getTime())) notifyCampaigns("campaign_bad_window");
  }
  const res = await activateCampaign(id, { closesAt, force: formData.get("force") === "on" });
  if (!res.ok) {
    const key = {
      not_found: "campaign_not_found",
      not_activable: "campaign_not_activable",
      below_threshold: "campaign_below_threshold",
      bad_window: "campaign_bad_window",
    } as const;
    notifyCampaigns(key[res.error]);
  }
  revalidatePath("/agenda");
  notifyCampaigns("saved");
}

export async function closeCampaignAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const row = UUID_RE.test(id) ? await closeCampaign(id) : null;
  revalidatePath("/agenda");
  notifyCampaigns(row ? "saved" : "campaign_not_found");
}
