/**
 * Delivery side of a booking (plan sections 11 "Prioridad 1", 13 "Vista
 * administrativa" and 14 "Desarrollo para Óscar"): the pre-session form mark,
 * the attended mark, the report with its draft/reviewed/approved states, and
 * the day-14 follow-up. Every write here is an admin action; the server action
 * checks credentials before calling in.
 */
import { and, asc, desc, eq, isNull, lte, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Booking, Report, ReportStatus } from "@/db/schema";
import { findService } from "@/lib/catalog";
import { effectiveStatus } from "./bookings";
import { BOGOTA, addMinutes, formatInZone } from "./time";

/** Days after the session when Liliana reviews how the client is doing. */
export const FOLLOW_UP_DAYS = 14;

/**
 * Where a booking is in the plan's pipeline. `pending_payment`, `confirmed`,
 * `cancelled` and `expired` come straight from the status column; `attended`
 * and `delivered` come from the delivery marks.
 */
export type Stage = Booking["status"] | "attended" | "delivered";

export function deliveryStage(b: Booking, report: Report | null, now: Date = new Date()): Stage {
  const status = effectiveStatus(b, now);
  if (status !== "confirmed") return status;
  if (!b.attendedAt) return "confirmed";
  return report?.status === "approved" ? "delivered" : "attended";
}

export type BookingWithReport = { booking: Booking; report: Report | null };

export async function getBookingWithReport(id: string): Promise<BookingWithReport | null> {
  const db = getDb();
  const [row] = await db
    .select({ booking: schema.bookings, report: schema.reports })
    .from(schema.bookings)
    .leftJoin(schema.reports, eq(schema.reports.bookingId, schema.bookings.id))
    .where(eq(schema.bookings.id, id))
    .limit(1);
  return row ?? null;
}

/** Approved report for the public status page; null while it is a draft. */
export async function findApprovedReport(bookingId: string): Promise<Report | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.reports)
    .where(and(eq(schema.reports.bookingId, bookingId), eq(schema.reports.status, "approved")))
    .limit(1);
  return row ?? null;
}

export type MarkResult = { ok: true; booking: Booking } | { ok: false; error: "not_found" | "not_confirmed" | "not_attended" };

async function loadBooking(id: string): Promise<Booking | null> {
  const [row] = await getDb().select().from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1);
  return row ?? null;
}

async function patch(id: string, values: Partial<typeof schema.bookings.$inferInsert>, now: Date): Promise<Booking> {
  const [row] = await getDb()
    .update(schema.bookings)
    .set({ ...values, updatedAt: now })
    .where(eq(schema.bookings.id, id))
    .returning();
  return row;
}

/** The pre-session form arrived (or the mark was set by mistake and is cleared). */
export async function markIntakeReceived(id: string, received: boolean, now: Date = new Date()): Promise<MarkResult> {
  const current = await loadBooking(id);
  if (!current) return { ok: false, error: "not_found" };
  if (current.status !== "confirmed") return { ok: false, error: "not_confirmed" };
  return { ok: true, booking: await patch(id, { intakeReceivedAt: received ? now : null }, now) };
}

/** The session took place. Only a confirmed booking can be attended; the mark is idempotent. */
export async function markAttended(id: string, now: Date = new Date()): Promise<MarkResult> {
  const current = await loadBooking(id);
  if (!current) return { ok: false, error: "not_found" };
  if (current.status !== "confirmed") return { ok: false, error: "not_confirmed" };
  if (current.attendedAt) return { ok: true, booking: current };
  return { ok: true, booking: await patch(id, { attendedAt: now }, now) };
}

/** The day-14 review happened. One flag, so the client is never written twice. */
export async function markFollowUpDone(id: string, now: Date = new Date()): Promise<MarkResult> {
  const current = await loadBooking(id);
  if (!current) return { ok: false, error: "not_found" };
  if (!current.attendedAt) return { ok: false, error: "not_attended" };
  if (current.followUpDoneAt) return { ok: true, booking: current };
  return { ok: true, booking: await patch(id, { followUpDoneAt: now }, now) };
}

export type SaveReportResult =
  | { ok: true; report: Report }
  | { ok: false; error: "not_found" | "empty" | "not_attended" };

/**
 * Upserts the one report of a booking. `approved` needs a non-empty body and an
 * attended session: the plan says no report goes out without review, and a
 * client only ever sees the approved version. Saving again as draft or
 * reviewed withdraws an earlier approval.
 */
export async function saveReport(
  bookingId: string,
  input: { body: string; status: ReportStatus },
  now: Date = new Date(),
): Promise<SaveReportResult> {
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "not_found" };
  const body = input.body.replace(/\r\n/g, "\n").trim();
  if (input.status !== "draft" && body.length === 0) return { ok: false, error: "empty" };
  if (input.status === "approved" && !booking.attendedAt) return { ok: false, error: "not_attended" };
  const approvedAt = input.status === "approved" ? now : null;
  const [report] = await getDb()
    .insert(schema.reports)
    .values({ bookingId, body, status: input.status, approvedAt, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.reports.bookingId,
      set: { body, status: input.status, approvedAt, updatedAt: now },
    })
    .returning();
  return { ok: true, report };
}

/** Confirmed sessions whose pre-session form has not arrived, soonest first. */
export async function listPendingIntake(): Promise<Booking[]> {
  return getDb()
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "confirmed"),
        isNull(schema.bookings.intakeReceivedAt),
        isNull(schema.bookings.attendedAt),
      ),
    )
    .orderBy(asc(schema.bookings.startsAt));
}

/** Attended sessions without an approved report, oldest session first. */
export async function listPendingDeliveries(): Promise<BookingWithReport[]> {
  return getDb()
    .select({ booking: schema.bookings, report: schema.reports })
    .from(schema.bookings)
    .leftJoin(schema.reports, eq(schema.reports.bookingId, schema.bookings.id))
    .where(
      and(
        eq(schema.bookings.status, "confirmed"),
        sql`${schema.bookings.attendedAt} is not null`,
        or(isNull(schema.reports.id), ne(schema.reports.status, "approved")),
      ),
    )
    .orderBy(asc(schema.bookings.attendedAt));
}

/** Sessions attended FOLLOW_UP_DAYS or more days ago whose follow-up is still open. */
export async function listFollowUpsDue(now: Date = new Date()): Promise<Booking[]> {
  const cutoff = addMinutes(now, -FOLLOW_UP_DAYS * 24 * 60);
  return getDb()
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "confirmed"),
        lte(schema.bookings.attendedAt, cutoff),
        isNull(schema.bookings.followUpDoneAt),
      ),
    )
    .orderBy(asc(schema.bookings.attendedAt));
}

/** Reports joined to the upcoming list, keyed by booking id. */
export async function reportsByBookingId(): Promise<Map<string, Report>> {
  const rows = await getDb().select().from(schema.reports).orderBy(desc(schema.reports.updatedAt));
  return new Map(rows.map((r) => [r.bookingId, r]));
}

/**
 * The summary template from plan section 3, pre-filled with what the booking
 * already knows. Liliana fills the rest by hand; nothing here computes a map.
 */
export function reportTemplate(b: Booking): string {
  const service = findService(b.serviceId)?.name ?? b.serviceId;
  return [
    `# Resumen de tu sesión`,
    ``,
    `- Código: ${b.code}`,
    `- Sesión: ${service}`,
    `- Fecha: ${formatInZone(b.startsAt, BOGOTA)} (hora de Colombia)`,
    `- Pregunta central: `,
    `- Versión de la metodología: `,
    ``,
    `## Tu mapa`,
    ``,
    `(Misión, interior, exterior y meta de vida. La leyenda común de los números 1 a 9 va aparte.)`,
    ``,
    `## Hallazgos`,
    ``,
    `Por cada hallazgo: número, ubicación en el mapa, de dónde sale el cálculo, interpretación simbólica, escena de la historia y el ejemplo que quisiste conservar.`,
    ``,
    `1. `,
    `2. `,
    `3. `,
    ``,
    `## Tres acciones o preguntas`,
    ``,
    `Qué, cuándo y para qué.`,
    ``,
    `1. `,
    `2. `,
    `3. `,
    ``,
    `## Próximo paso (opcional)`,
    ``,
  ].join("\n");
}
