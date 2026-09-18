/**
 * Agenda schema. See docs/adr/2026-09-17-agenda-postgres.md for the rules this
 * schema enforces. All instants are timestamptz; local dates and times are
 * America/Bogota (fixed UTC-5, no daylight saving).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Weekly recurring slots, e.g. Monday to Thursday at 18:00. */
export const availabilityRules = pgTable("availability_rules", {
  id: serial("id").primaryKey(),
  /** 0 = Sunday … 6 = Saturday (JavaScript convention). */
  weekday: integer("weekday").notNull(),
  /** "HH:MM" in Bogotá local time. */
  time: text("time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  active: boolean("active").notNull().default(true),
});

export const overrideKind = pgEnum("override_kind", ["closed", "extra"]);

/**
 * Per-date exceptions. `closed` with a null time closes the whole day; with a
 * time it removes that one slot. `extra` adds a slot the rules don't produce
 * (for example a Colombian morning for a client in Spain).
 */
export const availabilityOverrides = pgTable(
  "availability_overrides",
  {
    id: serial("id").primaryKey(),
    /** Bogotá calendar date. */
    date: date("date").notNull(),
    kind: overrideKind("kind").notNull(),
    time: text("time"),
    durationMinutes: integer("duration_minutes"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("availability_overrides_date_idx").on(t.date)],
);

export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "cancelled",
  "expired",
]);

export const contactChannel = pgEnum("contact_channel", ["whatsapp", "email"]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Public, unguessable reference the client uses to check status. */
    code: text("code").notNull(),
    serviceId: text("service_id").notNull(),
    /** Price shown at booking time, in COP. Catalog changes never rewrite it. */
    priceCop: integer("price_cop").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: bookingStatus("status").notNull().default("pending_payment"),
    /** While pending, the slot is blocked until this instant. */
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
    customerName: text("customer_name").notNull(),
    contactChannel: contactChannel("contact_channel").notNull(),
    contactValue: text("contact_value").notNull(),
    /** IANA zone the client chose when booking. */
    clientTimeZone: text("client_time_zone").notNull(),
    /** Anonymous source tag from ?origen=, e.g. "encuentro-01". */
    origin: text("origin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("bookings_code_idx").on(t.code),
    index("bookings_starts_at_idx").on(t.startsAt),
    // The double-booking guard. Only statuses that block a slot take part.
    // drizzle/0001_no_overlap.sql adds the matching EXCLUDE constraint on
    // tstzrange(starts_at, ends_at) so overlapping slots can't coexist either.
    uniqueIndex("bookings_active_slot_idx")
      .on(t.startsAt)
      .where(sql`${t.status} in ('pending_payment', 'confirmed')`),
  ],
);

export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = Booking["status"];
