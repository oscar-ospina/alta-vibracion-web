/**
 * Availability = weekly rules + per-date overrides − slots blocked by bookings.
 * Pure `computeSlots` is unit-tested; `loadAvailability` wires it to the DB.
 */
import { and, gte, inArray, lte } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type {
  AvailabilityOverride,
  AvailabilityRule,
  Booking,
} from "@/db/schema";
import {
  type HHMM,
  type ISODate,
  addDays,
  addMinutes,
  bogotaInstant,
  todayInBogota,
  weekdayOf,
} from "./time";

/** Earliest bookable day is tomorrow (Bogotá). Same-day requests go to WhatsApp. */
export const LEAD_DAYS = 1;
/** Four weeks out. */
export const HORIZON_DAYS = 28;

export type Slot = {
  date: ISODate;
  time: HHMM;
  durationMinutes: number;
  /** ISO instant, serialisable to the client. */
  startsAt: string;
};

export function bookableWindow(today: ISODate = todayInBogota()) {
  return { from: addDays(today, LEAD_DAYS), to: addDays(today, HORIZON_DAYS) };
}

type BlockedBooking = Pick<Booking, "startsAt" | "status" | "holdExpiresAt">;

export function blocksSlot(b: BlockedBooking, now: Date): boolean {
  if (b.status === "confirmed") return true;
  if (b.status === "pending_payment") return b.holdExpiresAt.getTime() > now.getTime();
  return false;
}

export function computeSlots(args: {
  rules: Pick<AvailabilityRule, "weekday" | "time" | "durationMinutes" | "active">[];
  overrides: Pick<AvailabilityOverride, "date" | "kind" | "time" | "durationMinutes">[];
  bookings: BlockedBooking[];
  from: ISODate;
  to: ISODate;
  now: Date;
}): Slot[] {
  const blocked = new Set(
    args.bookings
      .filter((b) => blocksSlot(b, args.now))
      .map((b) => b.startsAt.getTime()),
  );
  const overridesByDate = new Map<ISODate, typeof args.overrides>();
  for (const o of args.overrides) {
    const list = overridesByDate.get(o.date) ?? [];
    list.push(o);
    overridesByDate.set(o.date, list);
  }

  const slots: Slot[] = [];
  for (let date = args.from; date <= args.to; date = addDays(date, 1)) {
    const dayOverrides = overridesByDate.get(date) ?? [];
    if (dayOverrides.some((o) => o.kind === "closed" && o.time === null)) continue;
    const closedTimes = new Set(
      dayOverrides.filter((o) => o.kind === "closed" && o.time).map((o) => o.time),
    );
    const weekday = weekdayOf(date);
    const candidates = new Map<HHMM, number>();
    for (const r of args.rules) {
      if (r.active && r.weekday === weekday) candidates.set(r.time, r.durationMinutes);
    }
    for (const o of dayOverrides) {
      if (o.kind === "extra" && o.time) candidates.set(o.time, o.durationMinutes ?? 75);
    }
    for (const [time, durationMinutes] of [...candidates].sort()) {
      if (closedTimes.has(time)) continue;
      const start = bogotaInstant(date, time);
      if (start.getTime() <= args.now.getTime()) continue;
      if (blocked.has(start.getTime())) continue;
      slots.push({ date, time, durationMinutes, startsAt: start.toISOString() });
    }
  }
  return slots;
}

/** Slots the site may offer right now, within the bookable window. */
export async function loadAvailability(now: Date = new Date()): Promise<Slot[]> {
  const db = getDb();
  const { from, to } = bookableWindow(todayInBogota(now));
  const [rules, overrides, active] = await Promise.all([
    db.select().from(schema.availabilityRules),
    db
      .select()
      .from(schema.availabilityOverrides)
      .where(
        and(
          gte(schema.availabilityOverrides.date, from),
          lte(schema.availabilityOverrides.date, to),
        ),
      ),
    db
      .select({
        startsAt: schema.bookings.startsAt,
        status: schema.bookings.status,
        holdExpiresAt: schema.bookings.holdExpiresAt,
      })
      .from(schema.bookings)
      .where(
        and(
          inArray(schema.bookings.status, ["pending_payment", "confirmed"]),
          gte(schema.bookings.startsAt, bogotaInstant(from, "00:00")),
          lte(schema.bookings.startsAt, addMinutes(bogotaInstant(to, "23:59"), 1)),
        ),
      ),
  ]);
  return computeSlots({ rules, overrides, bookings: active, from, to, now });
}
