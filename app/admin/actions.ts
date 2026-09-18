"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireAdmin } from "@/lib/admin-auth-server";
import { setBookingStatus } from "@/lib/agenda/bookings";
import { HHMM_RE, ISO_DATE_RE } from "@/lib/agenda/time";

export async function confirmBooking(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await setBookingStatus(id, "confirmed");
  revalidatePath("/admin");
}

export async function cancelBooking(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await setBookingStatus(id, "cancelled");
  revalidatePath("/admin");
}

export async function addOverride(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const timeRaw = String(formData.get("time") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;
  if (!ISO_DATE_RE.test(date) || (kind !== "closed" && kind !== "extra")) return;
  const time = timeRaw ? timeRaw : null;
  if (time && !HHMM_RE.test(time)) return;
  if (kind === "extra" && !time) return;
  await getDb().insert(schema.availabilityOverrides).values({
    date,
    kind,
    time,
    durationMinutes: kind === "extra" ? 75 : null,
    note,
  });
  revalidatePath("/admin");
  revalidatePath("/agenda");
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
