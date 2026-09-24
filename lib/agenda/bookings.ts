/**
 * Booking writes and reads. `createBooking` is the only public insert path:
 * one transaction that sweeps expired holds, re-checks the slot is still
 * offered, and inserts. The partial unique index on bookings.starts_at is the
 * real guard; a 23505 here means someone else won the slot a moment earlier.
 */
import { randomBytes } from "node:crypto";
import { and, count, eq, gt, gte, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { EXCLUSION_VIOLATION, UNIQUE_VIOLATION, pgError } from "@/db/errors";
import type { Booking } from "@/db/schema";
import { FIRST_SESSION, findService } from "@/lib/catalog";
import { countPromoUsed, findCampaignByCode, isRegistered, lockAndViewCampaign, viewOf } from "@/lib/campaigns";
import { findGiftByCode, lockGiftRow } from "@/lib/gifts";
import { bookingsPaused } from "@/lib/settings";
import { loadAvailability, ruleDurationMinutes } from "./availability";
import { BOGOTA, addMinutes, bogotaInstant } from "./time";

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
  /** Voucher code from /regalar/<code>: a paid gift, redeemed once, no payment. */
  giftCode?: string | null;
};

export type CreateBookingError =
  | "slot_taken"
  | "unavailable"
  | "invalid_service"
  | "too_many"
  | "campaign_unavailable"
  | "campaign_not_eligible"
  | "campaign_sold_out"
  | "gift_unavailable"
  | "gift_used"
  | "paused";

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: CreateBookingError };

/** Thrown inside the booking transaction when the campaign's last cupo just went. */
class SoldOut extends Error {}
/** Thrown inside the booking transaction when the campaign closed or expired a moment earlier. */
class CampaignGone extends Error {}
/** Thrown inside the booking transaction when the voucher was redeemed a moment earlier. */
class GiftUsed extends Error {}
/** Thrown inside the booking transaction when the voucher was cancelled or refunded a moment earlier. */
class GiftGone extends Error {}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Inside the booking transaction: lock the order, check it is still paid and
 * mark it redeemed. The partial unique index on bookings.gift_order_id is the
 * final guard against two bookings for one voucher.
 */
async function redeemGiftInTx(tx: Tx, giftOrderId: string, now: Date) {
  await tx.execute(lockGiftRow(giftOrderId));
  const [order] = await tx.select().from(schema.giftOrders).where(eq(schema.giftOrders.id, giftOrderId)).limit(1);
  if (order?.status === "redeemed") throw new GiftUsed();
  if (order?.status !== "paid") throw new GiftGone();
  await tx
    .update(schema.giftOrders)
    .set({ status: "redeemed", redeemedAt: now, updatedAt: now })
    .where(eq(schema.giftOrders.id, giftOrderId));
}

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


export async function createBooking(
  input: CreateBookingInput,
  now: Date = new Date(),
): Promise<CreateBookingResult> {
  // Only an `active` service sells (plan section 9). Expectation and paused
  // services are rejected here, whatever the form said.
  const service = findService(input.serviceId);
  if (service?.status !== "active") return { ok: false, error: "invalid_service" };
  // Liliana's pause switch (plan section 12, row 6) closes the public path; the admin still books by hand.
  if (await bookingsPaused()) return { ok: false, error: "paused" };

  const offered = (await loadAvailability(now)).find((s) => s.startsAt === input.startsAt);
  if (!offered) return { ok: false, error: "unavailable" };

  const startsAt = new Date(offered.startsAt);
  const endsAt = addMinutes(startsAt, offered.durationMinutes);
  const holdExpiresAt = addMinutes(now, holdHours() * 60);
  const db = getDb();

  // Campaign price: only for an active campaign, a registered contact and a
  // free promo cupo. Anything else is an explicit error, never a silent
  // fallback to the general price (plan section 5, last bullet). This
  // pre-read fails fast; the transaction below re-checks under a row lock.
  let campaign: Awaited<ReturnType<typeof findCampaignByCode>> = null;
  if (input.campaignCode) {
    campaign = await findCampaignByCode(input.campaignCode);
    if (!campaign || campaign.serviceId !== service.id) return { ok: false, error: "campaign_unavailable" };
    const view = viewOf(campaign, await countPromoUsed(campaign.id, now), now);
    if (view === "sold_out") return { ok: false, error: "campaign_sold_out" };
    if (view !== "active") return { ok: false, error: "campaign_unavailable" };
    if (!(await isRegistered(campaign.id, input.contactValue))) return { ok: false, error: "campaign_not_eligible" };
  }

  // A paid voucher: the booking is confirmed on creation, price 0, no hold,
  // and the sale stays on the gift order (plan section 7.1).
  let gift: Awaited<ReturnType<typeof findGiftByCode>> = null;
  if (input.giftCode) {
    if (campaign) return { ok: false, error: "gift_unavailable" };
    gift = await findGiftByCode(input.giftCode);
    if (!gift || gift.serviceId !== service.id) return { ok: false, error: "gift_unavailable" };
    if (gift.status === "redeemed") return { ok: false, error: "gift_used" };
    if (gift.status !== "paid") return { ok: false, error: "gift_unavailable" };
  }

  if (!gift) {
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
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateBookingCode();
    try {
      const booking = await db.transaction(async (tx) => {
        await sweepExpiredHolds(tx, now);
        // The campaign's state under its row lock is what decides the price:
        // a close, an expiry or the last cupo that landed after the pre-read
        // is seen here. Buyers of one campaign are serialized by the lock.
        let priceCop = service.price;
        if (campaign) {
          const locked = await lockAndViewCampaign(tx, campaign.id, now);
          if (!locked) throw new CampaignGone();
          if (locked.view === "sold_out") throw new SoldOut();
          if (locked.view !== "active") throw new CampaignGone();
          priceCop = locked.campaign.priceCop;
        }
        if (gift) await redeemGiftInTx(tx, gift.id, now);
        const [row] = await tx
          .insert(schema.bookings)
          .values({
            code,
            serviceId: service.id,
            priceCop: gift ? 0 : priceCop,
            campaignId: campaign?.id ?? null,
            giftOrderId: gift?.id ?? null,
            status: gift ? "confirmed" : "pending_payment",
            confirmedAt: gift ? now : null,
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
      if (err instanceof CampaignGone) return { ok: false, error: "campaign_unavailable" };
      if (err instanceof GiftUsed) return { ok: false, error: "gift_used" };
      if (err instanceof GiftGone) return { ok: false, error: "gift_unavailable" };
      const pgErr = pgError(err);
      // Unique (same start) or exclusion (overlapping range): the slot is taken.
      if (pgErr?.code !== UNIQUE_VIOLATION && pgErr?.code !== EXCLUSION_VIOLATION) throw err;
      if (pgErr.constraint === "bookings_code_idx") continue; // retry with a new code
      if (pgErr.constraint === "bookings_gift_order_idx") return { ok: false, error: "gift_used" };
      return { ok: false, error: "slot_taken" };
    }
  }
  throw new Error("could not allocate a unique booking code");
}

export type ManualBookingInput = {
  customerName: string;
  contactChannel: "whatsapp" | "email";
  /** Already normalized (lib/contact.ts). */
  contactValue: string;
  /** Bogotá calendar date and time; any time, not only the offered slots. */
  date: string;
  time: string;
  priceCop: number;
  /** Liliana already verified the payment (late transfer, gift redemption). */
  paid: boolean;
  note?: string | null;
  /** Redeem this paid voucher: the booking is confirmed, price 0, the order becomes redeemed. */
  giftCode?: string | null;
};

export type ManualBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; error: "slot_taken" | "bad_values" | "past" | "gift_unavailable" | "gift_used" };

/**
 * A booking created by Liliana from the admin (plan section 7: a late payment
 * after the hold lapsed, a gift being redeemed, a client who wrote by
 * WhatsApp). It bypasses the public rules (lead day, offered slots, holds per
 * contact) but never the double-booking guard: the same unique index and the
 * overlap constraint decide, and a clash comes back as `slot_taken`.
 */
export async function createManualBooking(
  input: ManualBookingInput,
  now: Date = new Date(),
): Promise<ManualBookingResult> {
  if (input.customerName.trim().length < 2 || !Number.isInteger(input.priceCop) || input.priceCop < 0) {
    return { ok: false, error: "bad_values" };
  }
  const startsAt = bogotaInstant(input.date, input.time);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "bad_values" };
  if (startsAt.getTime() <= now.getTime()) return { ok: false, error: "past" };
  const db = getDb();
  let gift: Awaited<ReturnType<typeof findGiftByCode>> = null;
  if (input.giftCode) {
    gift = await findGiftByCode(input.giftCode);
    if (!gift) return { ok: false, error: "gift_unavailable" };
    if (gift.status === "redeemed") return { ok: false, error: "gift_used" };
    if (gift.status !== "paid") return { ok: false, error: "gift_unavailable" };
  }
  const endsAt = addMinutes(startsAt, await ruleDurationMinutes());

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateBookingCode();
    try {
      const booking = await db.transaction(async (tx) => {
        await sweepExpiredHolds(tx, now);
        if (gift) await redeemGiftInTx(tx, gift.id, now);
        const paid = input.paid || Boolean(gift);
        const [row] = await tx
          .insert(schema.bookings)
          .values({
            code,
            serviceId: FIRST_SESSION.id,
            priceCop: gift ? 0 : input.priceCop,
            giftOrderId: gift?.id ?? null,
            startsAt,
            endsAt,
            status: paid ? "confirmed" : "pending_payment",
            confirmedAt: paid ? now : null,
            holdExpiresAt: addMinutes(now, holdHours() * 60),
            customerName: input.customerName.trim(),
            contactChannel: input.contactChannel,
            contactValue: input.contactValue,
            clientTimeZone: BOGOTA,
            origin: input.note ? `manual:${input.note}` : "manual",
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        return row;
      });
      return { ok: true, booking };
    } catch (err) {
      if (err instanceof GiftUsed) return { ok: false, error: "gift_used" };
      if (err instanceof GiftGone) return { ok: false, error: "gift_unavailable" };
      const pgErr = pgError(err);
      if (pgErr?.code !== UNIQUE_VIOLATION && pgErr?.code !== EXCLUSION_VIOLATION) throw err;
      if (pgErr.constraint === "bookings_code_idx") continue;
      if (pgErr.constraint === "bookings_gift_order_idx") return { ok: false, error: "gift_used" };
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
    const row = await db.transaction(async (tx) => {
      const [updated] = await tx
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
      // Cancelling a gift's booking gives the voucher back: the sale stands,
      // the beneficiary picks another time (plan section 7.1, changes).
      if (updated && status === "cancelled" && updated.giftOrderId) {
        await tx
          .update(schema.giftOrders)
          .set({ status: "paid", redeemedAt: null, updatedAt: now })
          .where(and(eq(schema.giftOrders.id, updated.giftOrderId), eq(schema.giftOrders.status, "redeemed")));
      }
      return updated;
    });
    if (!row) return { ok: false, error: "not_pending" };
    return { ok: true, booking: row };
  } catch (err) {
    const code = pgError(err)?.code;
    if (code === UNIQUE_VIOLATION || code === EXCLUSION_VIOLATION) return { ok: false, error: "slot_taken" };
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
