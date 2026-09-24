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

export const campaignStatus = pgEnum("campaign_status", ["draft", "interest", "active", "closed"]);

/**
 * "Encuentro 729" offer (plan section 5). One row per event. The values are
 * Liliana's: threshold, capacity, price and window are set before she
 * announces the event, and activation is a manual admin action after she has
 * checked the group. The price is copied onto each order; changing a campaign
 * never rewrites an order (plan section 5, "Un precio aceptado queda guardado").
 */
export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Public, unguessable code that goes on the QR: /encuentros/<code>. */
    code: text("code").notNull(),
    /** Event name as Liliana says it aloud, e.g. "Encuentro en casa de Marta". */
    name: text("name").notNull(),
    serviceId: text("service_id").notNull(),
    priceCop: integer("price_cop").notNull(),
    /** Distinct adults who must register interest before Liliana activates. */
    threshold: integer("threshold").notNull(),
    /** Promotional cupos protected for this campaign (plan: at most three initially). */
    capacity: integer("capacity").notNull(),
    status: campaignStatus("status").notNull().default("draft"),
    /** Activation instant. */
    opensAt: timestamp("opens_at", { withTimezone: true }),
    /** Purchase deadline (plan: 48 hours after activation, editable). */
    closesAt: timestamp("closes_at", { withTimezone: true }),
    /** Whether the campaign price may be used to give the session (off by default). */
    allowsGift: boolean("allows_gift").notNull().default(false),
    /** Conditions shown to participants, versioned by hand. */
    conditions: text("conditions").notNull().default(""),
    conditionsVersion: integer("conditions_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("campaigns_code_idx").on(t.code)],
);

export const bookingStatus = pgEnum("booking_status", [
  "pending_payment",
  "confirmed",
  "cancelled",
  "expired",
]);

export const contactChannel = pgEnum("contact_channel", ["whatsapp", "email"]);

export const giftStatus = pgEnum("gift_status", [
  "pending_payment",
  "paid",
  "redeemed",
  "cancelled",
  "refunded",
]);

/**
 * A first session bought for another adult (plan section 7.1). The sale is
 * recorded here, once; the beneficiary's booking later points back through
 * `bookings.gift_order_id` and is not a second sale. The voucher `code` is
 * unguessable and single-use: the partial unique index on
 * `bookings.gift_order_id` lets one active booking exist per order.
 * Buyer and beneficiary stay separate: this row never holds the
 * beneficiary's data, and the buyer never sees the beneficiary's report.
 */
export const giftOrders = pgTable(
  "gift_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Public voucher code the buyer shares: /regalar/<code>. */
    code: text("code").notNull(),
    serviceId: text("service_id").notNull(),
    /** Price agreed with the buyer, in COP. Frozen at creation. */
    priceCop: integer("price_cop").notNull(),
    buyerName: text("buyer_name").notNull(),
    buyerContactChannel: contactChannel("buyer_contact_channel").notNull(),
    buyerContactValue: text("buyer_contact_value").notNull(),
    /** Optional dedication the beneficiary reads on the invitation. */
    message: text("message"),
    status: giftStatus("status").notNull().default("pending_payment"),
    /** Campaign whose price applied, when Liliana allowed gifts on it. */
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    /** The inquiry this order came from, when it started on /regalar. */
    interestId: uuid("interest_id").references(() => interests.id),
    /** Conditions (validity, changes, refunds) as agreed with the buyer. */
    conditions: text("conditions").notNull().default(""),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gift_orders_code_idx").on(t.code), index("gift_orders_status_idx").on(t.status)],
);


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
    /** The campaign whose price this booking took, when any. */
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    /** Set when this booking redeems a paid gift: not a sale, price_cop is 0. */
    giftOrderId: uuid("gift_order_id").references(() => giftOrders.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    /**
     * Delivery marks (plan sections 11 and 14). Nullable instants instead of
     * new `booking_status` values, so the double-booking guard above keeps its
     * exact predicate. Liliana sets them by hand from /admin.
     */
    /** The pre-session form arrived (it lives outside this app). */
    intakeReceivedAt: timestamp("intake_received_at", { withTimezone: true }),
    /** The session took place. */
    attendedAt: timestamp("attended_at", { withTimezone: true }),
    /** The day-14 follow-up was done; one flag so no client is written twice. */
    followUpDoneAt: timestamp("follow_up_done_at", { withTimezone: true }),
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
    // A voucher is redeemed once: one live booking per gift order.
    uniqueIndex("bookings_gift_order_idx")
      .on(t.giftOrderId)
      .where(sql`${t.status} in ('pending_payment', 'confirmed')`),
  ],
);

export const reportStatus = pgEnum("report_status", ["draft", "reviewed", "approved"]);

/**
 * The session summary Liliana writes for one booking. Only an `approved`
 * report is shown to the client on the status page; drafts stay behind
 * /admin. One report per booking.
 */
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  bookingId: uuid("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  status: reportStatus("status").notNull().default("draft"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interestKind = pgEnum("interest_kind", ["service", "gift", "company", "campaign"]);
export const interestStatus = pgEnum("interest_status", ["new", "contacted", "closed"]);

/**
 * Commercial interest (plan sections 7.1, 8 and 10 "Intereses"): a person
 * asking to be told when a future service is ready, a company asking about
 * the Empresas line, or someone asking to give the first session. Never a
 * sale and never a reservation. Minimal data: a preferred name, one contact
 * channel and the consent for that one notice. For a gift, no data about the
 * beneficiary; for a family line, no data about the child.
 *
 * `contact_value` is stored normalized (lib/contact.ts) so a campaign can
 * later match an interest against a booking. The partial unique index makes
 * a repeated form update the open row instead of creating a second person.
 */
export const interests = pgTable(
  "interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: interestKind("kind").notNull(),
    serviceId: text("service_id").notNull(),
    preferredName: text("preferred_name").notNull(),
    contactChannel: contactChannel("contact_channel").notNull(),
    contactValue: text("contact_value").notNull(),
    /** Companies only. */
    organization: text("organization"),
    /** Companies: what they want to explore. */
    topic: text("topic"),
    /** Gift: optional intent or dedication written by the buyer. */
    message: text("message"),
    /** Authorization for the one notice or the one reply this row is about. */
    consent: boolean("consent").notNull().default(false),
    status: interestStatus("status").notNull().default("new"),
    /** Anonymous source tag, e.g. a campaign code. */
    origin: text("origin"),
    /** Kind `campaign`: the event this person registered for (plan section 5, "Umbral"). */
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    index("interests_status_idx").on(t.status, t.kind),
    // One open interest per person, kind, service and campaign. Duplicate
    // forms update it, so three forms from one person are still one person.
    uniqueIndex("interests_open_idx")
      .on(t.kind, t.serviceId, t.contactValue, sql`coalesce(${t.campaignId}::text, '')`)
      .where(sql`${t.status} = 'new'`),
  ],
);

export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingStatus = Booking["status"];
export type Report = typeof reports.$inferSelect;
export type ReportStatus = Report["status"];
export type GiftOrder = typeof giftOrders.$inferSelect;
export type GiftStatus = GiftOrder["status"];
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignStatus = Campaign["status"];
export type Interest = typeof interests.$inferSelect;
export type InterestKind = Interest["kind"];
export type InterestStatus = Interest["status"];
