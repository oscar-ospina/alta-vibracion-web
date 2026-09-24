/**
 * Interest writes and reads (plan sections 7.1, 8, 10). An interest is never
 * a sale: it is the record that someone wants a notice, a reply about a gift,
 * or a conversation about the Empresas line. `saveInterest` is the only
 * public insert path; a repeated form for the same person, kind and service
 * updates the open row (the partial unique index in db/schema.ts) so the
 * campaign threshold can never be reached by one person sending three forms.
 */
import { and, desc, eq, sql } from "drizzle-orm";
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
  if (interestKindFor(input.serviceId) !== input.kind) return { ok: false, error: "invalid_service" };
  if (!input.consent) return { ok: false, error: "no_consent" };
  const db = getDb();
  const values = {
    kind: input.kind,
    serviceId: input.serviceId,
    preferredName: input.preferredName,
    contactChannel: input.contactChannel,
    contactValue: input.contactValue,
    organization: input.organization ?? null,
    topic: input.topic ?? null,
    message: input.message ?? null,
    consent: true,
    origin: input.origin ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const [row] = await db
    .insert(schema.interests)
    .values(values)
    .onConflictDoUpdate({
      target: [schema.interests.kind, schema.interests.serviceId, schema.interests.contactValue],
      targetWhere: sql`${schema.interests.status} = 'new'`,
      // Keep the first name and date; refresh what the person may have changed.
      set: {
        organization: values.organization,
        topic: values.topic,
        message: values.message,
        updatedAt: now,
      },
    })
    .returning();
  return { ok: true, interest: row, repeated: row.createdAt.getTime() !== now.getTime() };
}

/** Open interests of one kind, newest first, for the admin lists. */
export async function listInterests(kind: InterestKind, status: InterestStatus = "new"): Promise<Interest[]> {
  const db = getDb();
  return db
    .select()
    .from(schema.interests)
    .where(and(eq(schema.interests.kind, kind), eq(schema.interests.status, status)))
    .orderBy(desc(schema.interests.createdAt));
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
