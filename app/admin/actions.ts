"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireAdmin } from "@/lib/admin-auth-server";
import { setBookingStatus } from "@/lib/agenda/bookings";
import { HHMM_RE, ISO_DATE_RE } from "@/lib/agenda/time";

const NOTICE: Record<string, string> = {
  not_found: "La reserva no existe.",
  hold_expired: "El plazo de pago venció; el horario pudo ser tomado por otra persona. Pide al cliente reservar de nuevo.",
  not_pending: "La reserva ya no está pendiente.",
  slot_taken: "Otra reserva activa ocupa ese horario. No se confirmó.",
};

async function transition(formData: FormData, status: "confirmed" | "cancelled") {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const res = id ? await setBookingStatus(id, status) : ({ ok: false, error: "not_found" } as const);
  revalidatePath("/admin");
  if (!res.ok) redirect(`/admin?aviso=${encodeURIComponent(NOTICE[res.error])}`);
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
  if (!ISO_DATE_RE.test(date) || (kind !== "closed" && kind !== "extra")) return;
  const time = timeRaw ? timeRaw : null;
  if (time && !HHMM_RE.test(time)) return;
  if (kind === "extra" && !time) return;
  let durationMinutes: number | null = null;
  if (kind === "extra") {
    // Same length as the regular slots, so an extra morning protects the same time.
    const [rule] = await getDb().select().from(schema.availabilityRules).limit(1);
    durationMinutes = rule?.durationMinutes ?? 135;
  }
  await getDb().insert(schema.availabilityOverrides).values({ date, kind, time, durationMinutes, note });
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
