/**
 * "Encuentro 729" campaigns (plan section 5). A campaign collects interest
 * from the people of one event; once at least `threshold` distinct adults
 * registered, Liliana activates it by hand and, for `closesAt` minus now,
 * each registered person can buy the first session at the campaign price,
 * within `capacity` promotional cupos. Nothing here activates on its own.
 *
 * Eligibility (decided 2026-09-23): the campaign is active AND the contact
 * matches an interest registered for that campaign. A QR alone proves
 * nothing. A pending order holds its promo cupo for the same hours as its
 * slot; expired holds free the cupo.
 */
import { randomBytes } from "node:crypto";
import { and, count, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Campaign } from "@/db/schema";
import { findService } from "@/lib/catalog";
import { addMinutes } from "./agenda/time";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Public, unguessable code for the campaign link: "E-XXXXXXXX". */
export function generateCampaignCode(bytes: Buffer = randomBytes(8)): string {
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `E-${out}`;
}

export const CAMPAIGN_CODE_RE = /^E-[A-Z2-9]{8}$/;

/** Plan's proposed window: 48 hours from activation to buy. */
export const DEFAULT_WINDOW_HOURS = 48;

export type CreateCampaignInput = {
  name: string;
  priceCop: number;
  threshold: number;
  capacity: number;
  allowsGift: boolean;
  conditions: string;
};

export type CreateCampaignResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; error: "bad_values" };

/** Created straight in `interest` so the link works the moment Liliana prints the QR. */
export async function createCampaign(
  input: CreateCampaignInput,
  now: Date = new Date(),
): Promise<CreateCampaignResult> {
  const ints = [input.priceCop, input.threshold, input.capacity];
  if (!ints.every((n) => Number.isInteger(n) && n > 0) || input.name.trim().length < 2) {
    return { ok: false, error: "bad_values" };
  }
  const db = getDb();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [row] = await db
        .insert(schema.campaigns)
        .values({
          code: generateCampaignCode(),
          name: input.name.trim(),
          serviceId: "yo-01",
          priceCop: input.priceCop,
          threshold: input.threshold,
          capacity: input.capacity,
          status: "interest",
          allowsGift: input.allowsGift,
          conditions: input.conditions.trim(),
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return { ok: true, campaign: row };
    } catch (err) {
      const code = (err as { cause?: { code?: string } })?.cause?.code;
      if (code !== "23505") throw err;
    }
  }
  throw new Error("could not allocate a unique campaign code");
}

export async function findCampaignByCode(code: string): Promise<Campaign | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.code, code.trim().toUpperCase()))
    .limit(1);
  return row ?? null;
}

export async function findCampaignById(id: string): Promise<Campaign | null> {
  const db = getDb();
  const [row] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, id)).limit(1);
  return row ?? null;
}

export async function listCampaigns(): Promise<Campaign[]> {
  return getDb().select().from(schema.campaigns).orderBy(desc(schema.campaigns.createdAt));
}

/** Distinct people who registered for the campaign and were not closed out. */
export async function countRegistered(campaignId: string): Promise<number> {
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(schema.interests)
    .where(and(eq(schema.interests.campaignId, campaignId), ne(schema.interests.status, "closed")));
  return n;
}

/** Promo cupos taken: confirmed orders plus pending ones whose hold is alive. */
export async function countPromoUsed(campaignId: string, now: Date = new Date()): Promise<number> {
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.campaignId, campaignId),
        or(
          eq(schema.bookings.status, "confirmed"),
          and(eq(schema.bookings.status, "pending_payment"), gt(schema.bookings.holdExpiresAt, now)),
        ),
      ),
    );
  return n;
}

/**
 * What a visitor should see for the campaign right now. `expired` and
 * `sold_out` are derived, never stored: the row stays `active` until
 * Liliana closes it, so a cancelled order can free a cupo again.
 */
export type CampaignView = "interest" | "active" | "expired" | "sold_out" | "closed";

export function viewOf(c: Campaign, promoUsed: number, now: Date = new Date()): CampaignView {
  if (c.status === "draft" || c.status === "closed") return "closed";
  if (c.status === "interest") return "interest";
  if (c.closesAt && c.closesAt.getTime() <= now.getTime()) return "expired";
  if (promoUsed >= c.capacity) return "sold_out";
  return "active";
}

export type CampaignSummary = {
  campaign: Campaign;
  view: CampaignView;
  registered: number;
  promoUsed: number;
};

export async function summarize(c: Campaign, now: Date = new Date()): Promise<CampaignSummary> {
  const [registered, promoUsed] = await Promise.all([countRegistered(c.id), countPromoUsed(c.id, now)]);
  return { campaign: c, view: viewOf(c, promoUsed, now), registered, promoUsed };
}

export type ActivateResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; error: "not_found" | "not_activable" | "below_threshold" | "bad_window" };

/**
 * Liliana's manual activation after checking the group. `force` lets her
 * activate below the threshold on purpose (a smaller group she still wants
 * to honor); it is a checkbox, never a default.
 */
export async function activateCampaign(
  id: string,
  opts: { closesAt?: Date | null; force?: boolean } = {},
  now: Date = new Date(),
): Promise<ActivateResult> {
  const c = await findCampaignById(id);
  if (!c) return { ok: false, error: "not_found" };
  if (c.status !== "interest" && c.status !== "draft") return { ok: false, error: "not_activable" };
  const closesAt = opts.closesAt ?? addMinutes(now, DEFAULT_WINDOW_HOURS * 60);
  if (closesAt.getTime() <= now.getTime()) return { ok: false, error: "bad_window" };
  if (!opts.force && (await countRegistered(c.id)) < c.threshold) {
    return { ok: false, error: "below_threshold" };
  }
  const [row] = await getDb()
    .update(schema.campaigns)
    .set({ status: "active", opensAt: now, closesAt, updatedAt: now })
    .where(and(eq(schema.campaigns.id, id), inArray(schema.campaigns.status, ["interest", "draft"])))
    .returning();
  return row ? { ok: true, campaign: row } : { ok: false, error: "not_activable" };
}

export async function closeCampaign(id: string, now: Date = new Date()): Promise<Campaign | null> {
  const [row] = await getDb()
    .update(schema.campaigns)
    .set({ status: "closed", updatedAt: now })
    .where(eq(schema.campaigns.id, id))
    .returning();
  return row ?? null;
}

/** The contact registered for this campaign (any open or contacted interest). */
export async function isRegistered(campaignId: string, contactValue: string): Promise<boolean> {
  const [{ n }] = await getDb()
    .select({ n: count() })
    .from(schema.interests)
    .where(
      and(
        eq(schema.interests.campaignId, campaignId),
        eq(schema.interests.contactValue, contactValue),
        ne(schema.interests.status, "closed"),
      ),
    );
  return n > 0;
}

export type QuoteResult =
  | { state: "not_found" }
  | { state: "interest" | "expired" | "sold_out" | "closed"; campaign: Campaign }
  | { state: "active"; campaign: Campaign; eligible: boolean };

/**
 * What the campaign is worth to one contact right now. Used by the public
 * page's quote step and again, inside the booking transaction, by
 * `createBooking`.
 */
export async function quote(code: string, contactValue: string | null, now: Date = new Date()): Promise<QuoteResult> {
  if (!CAMPAIGN_CODE_RE.test(code.trim().toUpperCase())) return { state: "not_found" };
  const campaign = await findCampaignByCode(code);
  if (!campaign || campaign.status === "draft") return { state: "not_found" };
  const service = findService(campaign.serviceId);
  if (service?.status !== "active") return { state: "closed", campaign };
  const view = viewOf(campaign, await countPromoUsed(campaign.id, now), now);
  if (view !== "active") return { state: view, campaign };
  const eligible = contactValue ? await isRegistered(campaign.id, contactValue) : false;
  return { state: "active", campaign, eligible };
}

/** Lock the campaign row inside a transaction so two buyers cannot share the last cupo. */
export const lockCampaignRow = (id: string) =>
  sql`select id from campaigns where id = ${id} for update`;
