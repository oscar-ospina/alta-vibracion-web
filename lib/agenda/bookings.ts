/**
 * Booking writes and reads. `createBooking` is the only public insert path:
 * one transaction that sweeps expired holds, re-checks the slot is still
 * offered, and inserts. The partial unique index on bookings.starts_at is the
 * real guard; a 23505 here means someone else won the slot a moment earlier.
 */
import { randomBytes } from "node:crypto";
import { and, count, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Booking } from "@/db/schema";
import { findService } from "@/lib/catalog";
import { countPromoUsed, findCampaignByCode, isRegistered, lockCampaignRow, viewOf } from "@/lib/campaigns";
import { loadAvailability } from "./availability";
import { addMinutes } from "./time";

/** Unambiguous alphabet (no 0/O, 1/I). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBookingCode(bytes: Buffer = randomBytes(6)): string {
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `AV-${out}`;
}

export function holdHours(): number {
  const n = Number(process.env.BOOKING_HOLD_HOURS);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

export type CreateBookingInput = {
  serviceId: string;
  startsAt: string;
  customerName: string;
  contactChannel: "whatsapp" | "email";
  contactValue: string;
  clientTimeZone: string;
  origin: string | null;
  /** Campaign code from /encuentros/<code>; the price is applied only when eligible. */
  campaignCode?: string | null;
};

export type CreateBookingError =
  | "slot_taken"
  | "unavailable"
  | "invalid_service"
  | "too_many"
  | "campaign_unavailable"
  | "campaign_not_eligible"
  | "campaign_sold_out";

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: CreateBookingError };

/** Thrown inside the booking transaction when the campaign's last cupo just went. */
class SoldOut extends Error {}

/** Live holds one contact may have at once. Keeps a script from squatting the calendar. */
export const MAX_PENDING_PER_CONTACT = 2;

/** Marks pending holds past their expiry so the unique index lets the slot go. */
export async function sweepExpiredHolds(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  now: Date,
) {
  await tx
    .update(schema.bookings)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(schema.bookings.status, "pending_payment"),
        lte(schema.bookings.holdExpiresAt, now),
      ),
    );
}

/** Drizzle wraps driver errors; the SQLSTATE lives on the innermost cause. */
function unwrapPgError(err: unknown): { code?: string; constraint?: string } | null {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur && typeof cur === "object"; i++) {
    const e = cur as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof e.code === "string" && /^\d{5}$/.test(e.code)) {
      return { code: e.code, constraint: typeof e.constraint === "string" ? e.constraint : undefined };
    }
    cur = e.cause;
  }
  return null;
}

export async function createBooking(
  input: CreateBookingInput,
  now: Date = new Date(),
): Promise<CreateBookingResult> {
  // Only an `active` service sells (plan section 9). Expectation and paused
  // services are rejected here, whatever the form said.
  const service = findService(input.serviceId);
  if (service?.status !== "active") return { ok: false, error: "invalid_service" };

  const offered = (await loadAvailability(now)).find((s) => s.startsAt === input.startsAt);
  if (!offered) return { ok: false, error: "unavailable" };

  const startsAt = new Date(offered.startsAt);
  const endsAt = addMinutes(startsAt, offered.durationMinutes);
  const holdExpiresAt = addMinutes(now, holdHours() * 60);
  const db = getDb();

  // Campaign price: only for an active campaign, a registered contact and a
  // free promo cupo. Anything else is an explicit error, never a silent
  // fallback to the general price (plan section 5, last bullet).
  let campaign: Awaited<ReturnType<typeof findCampaignByCode>> = null;
  if (input.campaignCode) {
    campaign = await findCampaignByCode(input.campaignCode);
    if (!campaign || campaign.serviceId !== service.id) return { ok: false, error: "campaign_unavailable" };
    const view = viewOf(campaign, await countPromoUsed(campaign.id, now), now);
    if (view === "sold_out") return { ok: false, error: "campaign_sold_out" };
    if (view !== "active") return { ok: false, error: "campaign_unavailable" };
    if (!(await isRegistered(campaign.id, input.contactValue))) return { ok: false, error: "campaign_not_eligible" };
  }

  const [{ pending }] = await db
    .select({ pending: count() })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.contactValue, input.contactValue),
        eq(schema.bookings.status, "pending_payment"),
        gt(schema.bookings.holdExpiresAt, now),
      ),
    );
  if (pending >= MAX_PENDING_PER_CONTACT) return { ok: false, error: "too_many" };

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateBookingCode();
    try {
      const booking = await db.transaction(async (tx) => {
        await sweepExpiredHolds(tx, now);
        if (campaign) {
          // Serialize buyers of the same campaign so the last cupo goes to one of them.
          await tx.execute(lockCampaignRow(campaign.id));
          const [{ used }] = await tx
            .select({ used: count() })
            .from(schema.bookings)
            .where(
              and(
                eq(schema.bookings.campaignId, campaign.id),
                inArray(schema.bookings.status, ["pending_payment", "confirmed"]),
              ),
            );
          if (used >= campaign.capacity) throw new SoldOut();
        }
        const [row] = await tx
          .insert(schema.bookings)
          .values({
            code,
            serviceId: service.id,
            priceCop: campaign ? campaign.priceCop : service.price,
            campaignId: campaign?.id ?? null,
            startsAt,
            endsAt,
            holdExpiresAt,
            customerName: input.customerName,
            contactChannel: input.contactChannel,
            contactValue: input.contactValue,
            clientTimeZone: input.clientTimeZone,
            origin: input.origin,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        return row;
      });
      return { ok: true, booking };
    } catch (err) {
      if (err instanceof SoldOut) return { ok: false, error: "campaign_sold_out" };
      const pgErr = unwrapPgError(err);
      // 23505 = unique (same start), 23P01 = exclusion (overlapping range).
      if (pgErr?.code !== "23505" && pgErr?.code !== "23P01") throw err;
      if (pgErr.constraint === "bookings_code_idx") continue; // retry with a new code
      return { ok: false, error: "slot_taken" };
    }
  }
  throw new Error("could not allocate a unique booking code");
}

export async function findBookingByCode(code: string): Promise<Booking | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.code, code.trim().toUpperCase()))
    .limit(1);
  return row ?? null;
}

/** Bookings that start after 24 hours ago, soonest first (recent past stays visible). */
export async function listUpcomingBookings(now: Date = new Date()): Promise<Booking[]> {
  const db = getDb();
  const dayAgo = addMinutes(now, -24 * 60);
  return db
    .select()
    .from(schema.bookings)
    .where(gte(schema.bookings.startsAt, dayAgo))
    .orderBy(schema.bookings.startsAt);
}

export type SetStatusResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: "not_found" | "hold_expired" | "not_pending" | "slot_taken" | "attended" };

/**
 * Admin transitions. Confirm only applies to a pending booking whose hold is
 * still alive: a late payment on an expired hold must not revive a row whose
 * slot another visitor may have taken (the plan's "pago tardío" case). Cancel
 * applies to pending or confirmed rows.
 */
export async function setBookingStatus(
  id: string,
  status: "confirmed" | "cancelled",
  now: Date = new Date(),
): Promise<SetStatusResult> {
  const db = getDb();
  const [current] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.id, id))
    .limit(1);
  if (!current) return { ok: false, error: "not_found" };

  if (status === "confirmed") {
    if (current.status !== "pending_payment") return { ok: false, error: "not_pending" };
    if (current.holdExpiresAt.getTime() <= now.getTime()) {
      return { ok: false, error: "hold_expired" };
    }
  } else if (current.status !== "pending_payment" && current.status !== "confirmed") {
    return { ok: false, error: "not_pending" };
  } else if (current.attendedAt) {
    // A session that took place is history, not a slot to free.
    return { ok: false, error: "attended" };
  }

  try {
    const [row] = await db
      .update(schema.bookings)
      .set({
        status,
        updatedAt: now,
        confirmedAt: status === "confirmed" ? now : sql`${schema.bookings.confirmedAt}`,
      })
      .where(
        and(
          eq(schema.bookings.id, id),
          eq(schema.bookings.status, current.status),
        ),
      )
      .returning();
    if (!row) return { ok: false, error: "not_pending" };
    return { ok: true, booking: row };
  } catch (err) {
    const code = unwrapPgError(err)?.code;
    if (code === "23505" || code === "23P01") return { ok: false, error: "slot_taken" };
    throw err;
  }
}

/**
 * Whether a pending booking's hold has lapsed. Used for display: the row may
 * still say pending_payment until the next write sweeps it.
 */
export function effectiveStatus(b: Booking, now: Date = new Date()): Booking["status"] {
  if (b.status === "pending_payment" && b.holdExpiresAt.getTime() <= now.getTime()) {
    return "expired";
  }
  return b.status;
}
