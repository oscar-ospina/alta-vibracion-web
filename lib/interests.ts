/**
 * Interest writes and reads (plan sections 7.1, 8, 10). An interest is never
 * a sale: it is the record that someone wants a notice, a reply about a gift,
 * or a conversation about the Empresas line. `saveInterest` is the only
 * public insert path; a repeated form for the same person, kind and service
 * updates the open row (the partial unique index in db/schema.ts) so the
 * campaign threshold can never be reached by one person sending three forms.
 */
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Interest, InterestKind, InterestStatus } from "@/db/schema";
import { findService } from "@/lib/catalog";
import type { ContactChannel } from "@/lib/contact";

export type SaveInterestInput = {
  kind: InterestKind;
  serviceId: string;
  preferredName: string;
  contactChannel: ContactChannel;
  /** Already normalized (lib/contact.ts). */
  contactValue: string;
  organization?: string | null;
  topic?: string | null;
  message?: string | null;
  consent: boolean;
  origin?: string | null;
  /** Kind `campaign` only: the event registered for. */
  campaignId?: string | null;
};

export type SaveInterestResult =
  | { ok: true; interest: Interest; repeated: boolean }
  | { ok: false; error: "invalid_service" | "no_consent" };

/** Which services accept which kind of interest. */
export function interestKindFor(serviceId: string): InterestKind | null {
  const s = findService(serviceId);
  if (!s || s.status === "draft") return null;
  if (s.line === "empresas") return "company";
  if (s.status === "expectation") return "service";
  return s.allowsGift ? "gift" : null;
}

export async function saveInterest(
  input: SaveInterestInput,
  now: Date = new Date(),
): Promise<SaveInterestResult> {
  if (input.kind === "campaign") {
    // A campaign registration is an interest in the campaign's own service.
    if (!input.campaignId || findService(input.serviceId)?.status !== "active") {
      return { ok: false, error: "invalid_service" };
    }
  } else if (interestKindFor(input.serviceId) !== input.kind || input.campaignId) {
    return { ok: false, error: "invalid_service" };
  }
  if (!input.consent) return { ok: false, error: "no_consent" };
  const db = getDb();
  const campaignId = input.campaignId ?? null;
  const sameOpenRow = and(
    eq(schema.interests.kind, input.kind),
    eq(schema.interests.serviceId, input.serviceId),
    eq(schema.interests.contactValue, input.contactValue),
    campaignId ? eq(schema.interests.campaignId, campaignId) : isNull(schema.interests.campaignId),
    eq(schema.interests.status, "new"),
  );
  // Refresh what the person may have changed; keep the first name and date.
  const refresh = {
    organization: input.organization ?? null,
    topic: input.topic ?? null,
    message: input.message ?? null,
    updatedAt: now,
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const [existing] = await db.update(schema.interests).set(refresh).where(sameOpenRow).returning();
    if (existing) return { ok: true, interest: existing, repeated: true };
    try {
      const [row] = await db
        .insert(schema.interests)
        .values({
          kind: input.kind,
          serviceId: input.serviceId,
          preferredName: input.preferredName,
          contactChannel: input.contactChannel,
          contactValue: input.contactValue,
          ...refresh,
          consent: true,
          origin: input.origin ?? null,
          campaignId,
          createdAt: now,
        })
        .returning();
      return { ok: true, interest: row, repeated: false };
    } catch (err) {
      // 23505 on interests_open_idx: the same person submitted twice at once.
      // The index is the guard; the next loop turn updates the winner's row.
      if (unwrapCode(err) !== "23505") throw err;
    }
  }
  throw new Error("could not save the interest");
}

function unwrapCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur && typeof cur === "object"; i++) {
    const e = cur as { code?: unknown; cause?: unknown };
    if (typeof e.code === "string" && /^\d{5}$/.test(e.code)) return e.code;
    cur = e.cause;
  }
  return undefined;
}

/** Open interests of one kind, newest first, for the admin lists. */
export async function listInterests(kind: InterestKind, status: InterestStatus = "new"): Promise<Interest[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.interests)
    .where(and(eq(schema.interests.kind, kind), eq(schema.interests.status, status), isNull(schema.interests.campaignId)))
    .orderBy(desc(schema.interests.createdAt));
}

/** Everyone registered for one campaign, oldest first, for Liliana's check before activating. */
export async function listCampaignInterests(campaignId: string): Promise<Interest[]> {
  return getDb()
    .select()
    .from(schema.interests)
    .where(eq(schema.interests.campaignId, campaignId))
    .orderBy(schema.interests.createdAt);
}

export type SetInterestStatusResult = { ok: true; interest: Interest } | { ok: false; error: "not_found" };

/** Admin transition. `contacted` and `closed` are one-way marks; a row never returns to `new`. */
export async function setInterestStatus(
  id: string,
  status: "contacted" | "closed",
  now: Date = new Date(),
): Promise<SetInterestStatusResult> {
  const db = getDb();
  const [row] = await db
    .update(schema.interests)
    .set({
      status,
      updatedAt: now,
      ...(status === "contacted" ? { contactedAt: now } : { closedAt: now }),
    })
    .where(eq(schema.interests.id, id))
    .returning();
  return row ? { ok: true, interest: row } : { ok: false, error: "not_found" };
}
