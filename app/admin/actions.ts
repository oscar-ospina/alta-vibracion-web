"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireAdmin } from "@/lib/admin-auth-server";
import { ruleDurationMinutes } from "@/lib/agenda/availability";
import { createManualBooking, setBookingStatus } from "@/lib/agenda/bookings";
import { isContactChannel, isValidContact, normalizeContact } from "@/lib/contact";
import { markAttended, markFollowUpDone, markIntakeReceived, saveReport } from "@/lib/agenda/delivery";
import { setInterestStatus } from "@/lib/interests";
import { activateCampaign, closeCampaign, createCampaign } from "@/lib/campaigns";
import { createGiftFromInterest, createGiftOrder, setGiftStatus, updateGiftMessage } from "@/lib/gifts";
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
    durationMinutes = await ruleDurationMinutes();
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

// Manual booking (lib/agenda/bookings.ts createManualBooking): late payments,
// gift redemptions and clients who wrote by WhatsApp.

export async function createManualBookingAction(formData: FormData) {
  await requireAdmin();
  const customerName = String(formData.get("customerName") ?? "").trim().slice(0, 80);
  const contactChannel = String(formData.get("contactChannel") ?? "");
  const contactRaw = String(formData.get("contactValue") ?? "").trim().slice(0, 120);
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "").trim();
  const priceRaw = String(formData.get("priceCop") ?? "").trim();
  if (!/^\d{1,9}$/.test(priceRaw)) notify("manual_bad_values");
  const priceCop = Number(priceRaw);
  const paid = formData.get("paid") === "on";
  const note = String(formData.get("note") ?? "").trim().slice(0, 40) || null;
  const giftCode = String(formData.get("giftCode") ?? "").trim().toUpperCase().slice(0, 12) || null;
  if (!isContactChannel(contactChannel) || !isValidContact(contactChannel, contactRaw)) notify("manual_bad_contact");
  if (!ISO_DATE_RE.test(date) || addDays(date, 0) !== date) notify("bad_date");
  if (!HHMM_RE.test(time)) notify("bad_time");
  if (note && !/^[a-z0-9-]+$/i.test(note)) notify("manual_bad_values");
  const res = await createManualBooking({
    customerName,
    contactChannel,
    contactValue: normalizeContact(contactChannel, contactRaw),
    date,
    time,
    priceCop,
    paid,
    note,
    giftCode,
  });
  revalidatePath("/admin");
  revalidatePath("/agenda");
  if (!res.ok) {
    const key = {
      slot_taken: "slot_taken",
      past: "manual_past",
      bad_values: "manual_bad_values",
      gift_unavailable: "gift_unavailable",
      gift_used: "gift_used",
    } as const;
    notify(key[res.error]);
  }
  redirect(`/admin/bookings/${res.booking.id}?aviso=saved`);
}

// Gift orders (lib/gifts.ts): /admin/gifts.

function notifyGifts(key: AdminNoticeKey): never {
  revalidatePath("/admin/gifts");
  redirect(`/admin/gifts?aviso=${key}`);
}

export async function createGiftOrderAction(formData: FormData) {
  await requireAdmin();
  const channel = String(formData.get("buyerContactChannel") ?? "");
  const contactRaw = String(formData.get("buyerContactValue") ?? "").trim().slice(0, 120);
  if (!isContactChannel(channel) || !isValidContact(channel, contactRaw)) notifyGifts("manual_bad_contact");
  const campaignId = String(formData.get("campaignId") ?? "").trim();
  if (campaignId && !UUID_RE.test(campaignId)) notifyGifts("gift_campaign_unavailable");
  const priceRaw = String(formData.get("priceCop") ?? "").trim();
  if (!/^\d{1,9}$/.test(priceRaw)) notifyGifts("gift_bad_values");
  const res = await createGiftOrder({
    buyerName: String(formData.get("buyerName") ?? "").slice(0, 80),
    buyerContactChannel: channel,
    buyerContactValue: normalizeContact(channel, contactRaw),
    message: String(formData.get("message") ?? "").slice(0, 500),
    priceCop: Number(priceRaw),
    campaignId: campaignId || null,
    conditions: String(formData.get("conditions") ?? "").slice(0, 2000),
    paid: formData.get("paid") === "on",
  });
  if (!res.ok) notifyGifts(res.error === "bad_values" ? "gift_bad_values" : "gift_campaign_unavailable");
  revalidatePath("/admin");
  notifyGifts("saved");
}

export async function createGiftFromInterestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("interestId") ?? "");
  const res = UUID_RE.test(id) ? await createGiftFromInterest(id) : ({ ok: false, error: "not_found" } as const);
  revalidatePath("/admin/interests");
  if (!res.ok) notifyGifts(res.error === "not_found" ? "interest_not_found" : res.error === "bad_values" ? "gift_bad_values" : "gift_campaign_unavailable");
  notifyGifts("saved");
}

export async function setGiftStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "paid" && status !== "cancelled" && status !== "refunded") notifyGifts("gift_bad_transition");
  const res = UUID_RE.test(id) ? await setGiftStatus(id, status) : ({ ok: false, error: "not_found" } as const);
  revalidatePath("/admin");
  notifyGifts(res.ok ? "saved" : res.error === "not_found" ? "gift_not_found" : "gift_bad_transition");
}

export async function updateGiftMessageAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const message = String(formData.get("message") ?? "").slice(0, 500);
  const res = UUID_RE.test(id) ? await updateGiftMessage(id, message) : ({ ok: false, error: "not_found" } as const);
  notifyGifts(res.ok ? "saved" : "gift_not_found");
}
