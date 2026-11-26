"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth-server";
import { setBookingStatus } from "@/lib/agenda/bookings";
import { markAttended, markFollowUpDone, markIntakeReceived, saveReport } from "@/lib/agenda/delivery";
import { setInterestStatus } from "@/lib/interests";
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
