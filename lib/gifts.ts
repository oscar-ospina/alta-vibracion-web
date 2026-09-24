/**
 * Gift orders (plan section 7.1): the first session bought for another
 * adult. The sale is recorded once, here, when Liliana confirms the payment;
 * the beneficiary's booking later redeems the voucher and is not a sale.
 *
 * Buyer and beneficiary stay separate: the order holds the buyer's name and
 * contact and an optional message, never the beneficiary's data; the buyer
 * never receives the report. A paid, unscheduled order commits real
 * capacity, which the admin shows as a warning against the free slots of
 * the next 30 days (decided 2026-09-23: a warning, never a hard block).
 */
import { randomBytes } from "node:crypto";
import { and, count, desc, eq, inArray, notExists, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { UNIQUE_VIOLATION, pgError } from "@/db/errors";
import type { GiftOrder } from "@/db/schema";
import { loadAvailability } from "@/lib/agenda/availability";
import { countPromoUsed, findCampaignById, viewOf } from "@/lib/campaigns";
import { FIRST_SESSION } from "@/lib/catalog";
import type { ContactChannel } from "@/lib/contact";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Public, unguessable voucher code: "RG-XXXXXXXX". */
export function generateGiftCode(bytes: Buffer = randomBytes(8)): string {
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `RG-${out}`;
}

export const GIFT_CODE_RE = /^RG-[A-Z2-9]{8}$/;

export type CreateGiftOrderInput = {
  buyerName: string;
  buyerContactChannel: ContactChannel;
  /** Already normalized (lib/contact.ts). */
  buyerContactValue: string;
  message?: string | null;
  priceCop: number;
  /** Only a campaign that allows gifts, active, with a free promo cupo. */
  campaignId?: string | null;
  interestId?: string | null;
  conditions: string;
  /** Liliana already verified the payment. */
  paid: boolean;
};

export type CreateGiftOrderResult =
  | { ok: true; order: GiftOrder }
  | { ok: false; error: "bad_values" | "campaign_unavailable" };

export async function createGiftOrder(
  input: CreateGiftOrderInput,
  now: Date = new Date(),
): Promise<CreateGiftOrderResult> {
  if (input.buyerName.trim().length < 2 || !Number.isInteger(input.priceCop) || input.priceCop < 0) {
    return { ok: false, error: "bad_values" };
  }
  let priceCop = input.priceCop;
  if (input.campaignId) {
    const c = await findCampaignById(input.campaignId);
    if (!c || !c.allowsGift) return { ok: false, error: "campaign_unavailable" };
    if (viewOf(c, await countPromoUsed(c.id, now), now) !== "active") return { ok: false, error: "campaign_unavailable" };
    priceCop = c.priceCop;
  }
  const db = getDb();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [row] = await db
        .insert(schema.giftOrders)
        .values({
          code: generateGiftCode(),
          serviceId: FIRST_SESSION.id,
          priceCop,
          buyerName: input.buyerName.trim(),
          buyerContactChannel: input.buyerContactChannel,
          buyerContactValue: input.buyerContactValue,
          message: input.message?.trim() || null,
          status: input.paid ? "paid" : "pending_payment",
          paidAt: input.paid ? now : null,
          campaignId: input.campaignId ?? null,
          interestId: input.interestId ?? null,
          conditions: input.conditions.trim(),
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return { ok: true, order: row };
    } catch (err) {
      if (pgError(err)?.code !== UNIQUE_VIOLATION) throw err;
    }
  }
  throw new Error("could not allocate a unique gift code");
}

/**
 * Start an order from an inquiry on /regalar: the buyer's data is copied,
 * the price is the general one until Liliana edits it, the inquiry is marked
 * contacted. Payment is still to be verified.
 */
export async function createGiftFromInterest(
  interestId: string,
  now: Date = new Date(),
): Promise<CreateGiftOrderResult | { ok: false; error: "not_found" }> {
  const db = getDb();
  const [interest] = await db
    .select()
    .from(schema.interests)
    .where(and(eq(schema.interests.id, interestId), eq(schema.interests.kind, "gift")))
    .limit(1);
  if (!interest) return { ok: false, error: "not_found" };
  const res = await createGiftOrder(
    {
      buyerName: interest.preferredName,
      buyerContactChannel: interest.contactChannel,
      buyerContactValue: interest.contactValue,
      message: interest.message,
      priceCop: FIRST_SESSION.price,
      interestId: interest.id,
      conditions: "",
      paid: false,
    },
    now,
  );
  if (res.ok && interest.status === "new") {
    await db
      .update(schema.interests)
      .set({ status: "contacted", contactedAt: now, updatedAt: now })
      .where(eq(schema.interests.id, interest.id));
  }
  return res;
}

export async function findGiftByCode(code: string): Promise<GiftOrder | null> {
  const [row] = await getDb()
    .select()
    .from(schema.giftOrders)
    .where(eq(schema.giftOrders.code, code.trim().toUpperCase()))
    .limit(1);
  return row ?? null;
}

export async function findGiftById(id: string): Promise<GiftOrder | null> {
  const [row] = await getDb().select().from(schema.giftOrders).where(eq(schema.giftOrders.id, id)).limit(1);
  return row ?? null;
}

export async function listGiftOrders(): Promise<GiftOrder[]> {
  return getDb().select().from(schema.giftOrders).orderBy(desc(schema.giftOrders.createdAt));
}

/** Paid vouchers with no live booking yet: the plan's "Regalos por agendar". */
export async function listGiftsToSchedule(): Promise<GiftOrder[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.giftOrders)
    .where(
      and(
        eq(schema.giftOrders.status, "paid"),
        notExists(
          db
            .select({ one: sql`1` })
            .from(schema.bookings)
            .where(
              and(
                eq(schema.bookings.giftOrderId, schema.giftOrders.id),
                inArray(schema.bookings.status, ["pending_payment", "confirmed"]),
              ),
            ),
        ),
      ),
    )
    .orderBy(schema.giftOrders.paidAt);
}

export type GiftCapacity = { unscheduled: number; freeSlots: number; short: boolean };

/** Paid vouchers without a slot against the slots still free in the public horizon. */
export async function giftCapacity(now: Date = new Date()): Promise<GiftCapacity> {
  const [unscheduled, slots] = await Promise.all([listGiftsToSchedule(), loadAvailability(now)]);
  return { unscheduled: unscheduled.length, freeSlots: slots.length, short: unscheduled.length > slots.length };
}

export type SetGiftStatusResult =
  | { ok: true; order: GiftOrder }
  | { ok: false; error: "not_found" | "bad_transition" };

/**
 * Admin transitions. Paid only from pending; cancelled from pending or paid
 * (a redeemed voucher has a booking, cancel that instead); refunded from paid
 * or redeemed, as a record of money going back.
 */
export async function setGiftStatus(
  id: string,
  status: "paid" | "cancelled" | "refunded",
  now: Date = new Date(),
): Promise<SetGiftStatusResult> {
  const allowed: Record<typeof status, GiftOrder["status"][]> = {
    paid: ["pending_payment"],
    cancelled: ["pending_payment", "paid"],
    refunded: ["paid", "redeemed"],
  };
  const [row] = await getDb()
    .update(schema.giftOrders)
    .set({ status, updatedAt: now, ...(status === "paid" ? { paidAt: now } : {}) })
    .where(and(eq(schema.giftOrders.id, id), inArray(schema.giftOrders.status, allowed[status])))
    .returning();
  if (row) return { ok: true, order: row };
  return { ok: false, error: (await findGiftById(id)) ? "bad_transition" : "not_found" };
}

export type RedeemableGift =
  | { state: "not_found" }
  | { state: "pending" | "redeemed" | "cancelled" | "ready"; order: GiftOrder };

/** What the beneficiary may do with a voucher code right now. */
export async function redeemableGift(code: string): Promise<RedeemableGift> {
  const c = code.trim().toUpperCase();
  if (!GIFT_CODE_RE.test(c)) return { state: "not_found" };
  const order = await findGiftByCode(c);
  if (!order) return { state: "not_found" };
  if (order.status === "paid") return { state: "ready", order };
  if (order.status === "pending_payment") return { state: "pending", order };
  if (order.status === "redeemed") return { state: "redeemed", order };
  return { state: "cancelled", order };
}

/** Lock the order row inside the booking transaction so a voucher is redeemed once. */
export const lockGiftRow = (id: string) => sql`select id from gift_orders where id = ${id} for update`;

/** Promo cupos a campaign's gift orders take (plan: "mismo consumo de capacidad"). */
export async function countCampaignGifts(campaignId: string): Promise<number> {
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(schema.giftOrders)
    .where(
      and(
        eq(schema.giftOrders.campaignId, campaignId),
        inArray(schema.giftOrders.status, ["pending_payment", "paid", "redeemed"]),
      ),
    );
  return n;
}

