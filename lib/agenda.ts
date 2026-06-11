/**
 * Agenda slot model for the local-MVP booking flow (story oscar-ospina/saas-planner#45).
 *
 * No backend: availability is SIMULATED client-side — on the first view of a date,
 * 1–3 slots are blocked at random and persisted in the visitor's browser (see
 * lib/agenda-store.ts) — and the booking is handed off via WhatsApp; Liliana syncs
 * her real calendar manually. The deferred Google Calendar track (#40/#41/#43/#44)
 * swaps this grid for real busy data later; these helpers stay pure so that swap
 * stays contained.
 *
 * Dates are "YYYY-MM-DD" strings anchored to America/Bogotá (UTC-5, no DST):
 * "today" comes from Intl with an explicit timeZone — never the visitor's clock —
 * and day arithmetic uses Date.UTC so the visitor's timezone can't shift a date
 * across midnight.
 */

/** Calendar date in "YYYY-MM-DD" form (Bogotá-anchored). */
export type ISODate = string;

export type Modality = "presencial" | "virtual";

/** Daily slot grid — mirrors the design kit's TIMES (8–11 AM, 2–4 PM). */
export const SLOT_TIMES = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
] as const;

export type SlotTime = (typeof SLOT_TIMES)[number];

/** Earliest bookable day = tomorrow (Bogotá) — same-day requests go to WhatsApp. */
const LEAD_DAYS = 1;
/** Booking horizon — 4 weeks out. */
const HORIZON_DAYS = 28;
/** Simulated-busy range per date: blocked slot count is uniform in [MIN, MAX]. */
const MIN_BLOCKED = 1;
const MAX_BLOCKED = 3;

const BOGOTA = "America/Bogota";

/** Today's date in Bogotá regardless of the visitor's clock ("en-CA" → YYYY-MM-DD). */
export function todayInBogota(): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA }).format(
    new Date(),
  );
}

function toUTCDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: ISODate, days: number): ISODate {
  const date = toUTCDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISO(date);
}

/** Liliana attends Monday–Friday. */
function isWorkingDay(iso: ISODate): boolean {
  const day = toUTCDate(iso).getUTCDay();
  return day >= 1 && day <= 5;
}

/** First selectable date: the first working day after the lead time. */
export function firstBookableDate(today: ISODate): ISODate {
  let date = addDays(today, LEAD_DAYS);
  while (!isWorkingDay(date)) date = addDays(date, 1);
  return date;
}

/**
 * Last selectable date: the horizon, clamped BACK to a working day — otherwise
 * a horizon ending on a weekend at the start of a month makes "Mes siguiente"
 * open a grid with zero selectable days (e.g. today 2026-07-04 → horizon Sat
 * 2026-08-01, an all-disabled August).
 */
export function lastBookableDate(today: ISODate): ISODate {
  let date = addDays(today, HORIZON_DAYS);
  while (!isWorkingDay(date)) date = addDays(date, -1);
  return date;
}

/** ISO strings compare lexicographically, so date bounds are plain comparisons. */
export function isBookableDate(iso: ISODate, today: ISODate): boolean {
  return (
    isWorkingDay(iso) &&
    iso >= addDays(today, LEAD_DAYS) &&
    iso <= lastBookableDate(today)
  );
}

export type MonthCursor = { year: number; month: number }; // month: 1–12

export function monthCursorFor(iso: ISODate): MonthCursor {
  const [year, month] = iso.split("-").map(Number);
  return { year, month };
}

export function shiftMonth(cursor: MonthCursor, by: number): MonthCursor {
  const index = cursor.year * 12 + (cursor.month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function sameMonth(a: MonthCursor, b: MonthCursor): boolean {
  return a.year === b.year && a.month === b.month;
}

/**
 * Monday-based month grid: leading `null`s pad the first row, then one ISO date
 * per day of the month.
 */
export function monthGridDates(cursor: MonthCursor): (ISODate | null)[] {
  const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(cursor.year, cursor.month, 0),
  ).getUTCDate();
  const cells: (ISODate | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISO(new Date(Date.UTC(cursor.year, cursor.month - 1, d))));
  }
  return cells;
}

const monthFormat = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "junio de 2026" → "Junio de 2026". */
export function monthLabel(cursor: MonthCursor): string {
  const label = monthFormat.format(
    new Date(Date.UTC(cursor.year, cursor.month - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const longDateFormat = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "miércoles, 17 de junio" — for slot summaries and day aria-labels. */
export function formatLongDate(iso: ISODate): string {
  return longDateFormat.format(toUTCDate(iso));
}

/** "08:00" → "8:00 AM", "14:00" → "2:00 PM" (the design kit's slot labels). */
export function formatSlotLabel(time: SlotTime): string {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

/**
 * Pick the simulated-busy slots for a freshly viewed date: a uniform count in
 * [MIN_BLOCKED, MAX_BLOCKED], sampled without replacement, in day order. `rng`
 * is injectable for tests.
 */
export function pickBlockedSlots(rng: () => number = Math.random): SlotTime[] {
  const count =
    MIN_BLOCKED + Math.floor(rng() * (MAX_BLOCKED - MIN_BLOCKED + 1));
  const pool = [...SLOT_TIMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort();
}

/** Prefilled WhatsApp text — the booking "payload" of this MVP (es-CO copy). */
export function buildBookingMessage(args: {
  name: string;
  consultationName: string;
  modality: Modality;
  date: ISODate;
  time: SlotTime;
}): string {
  return (
    `Hola, soy ${args.name}. Quiero agendar la consulta «${args.consultationName}» ` +
    `en modalidad ${args.modality} el ${formatLongDate(args.date)} a las ` +
    `${formatSlotLabel(args.time)} (hora de Colombia). ¿Me confirmas la disponibilidad?`
  );
}
