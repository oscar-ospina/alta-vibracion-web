/**
 * Time helpers for the agenda. Liliana's calendar is America/Bogota, a fixed
 * UTC-5 with no daylight saving, so a Bogotá date + "HH:MM" maps to exactly one
 * instant. The visitor's zone is only ever used for display, through Intl, so
 * daylight-saving rules for Madrid or Mexico City come from the runtime, never
 * from a hardcoded offset.
 */

export const BOGOTA = "America/Bogota";
const BOGOTA_OFFSET = "-05:00";

/** Calendar date in "YYYY-MM-DD" form. */
export type ISODate = string;
/** Local time in "HH:MM" form. */
export type HHMM = string;

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The instant at which a Bogotá local date + time starts. */
export function bogotaInstant(date: ISODate, time: HHMM): Date {
  return new Date(`${date}T${time}:00${BOGOTA_OFFSET}`);
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

/** Today's Bogotá date, whatever the machine's clock zone. */
export function todayInBogota(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA }).format(now);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, for a Bogotá calendar date. */
export function weekdayOf(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Bogotá date of an instant, e.g. for grouping slots by day. */
export function bogotaDateOf(instant: Date): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA }).format(instant);
}

/** Bogotá "HH:MM" of an instant. */
export function bogotaTimeOf(instant: Date): HHMM {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BOGOTA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/**
 * "martes, 22 de septiembre, 6:00 p. m." in the given zone. Used for both the
 * Bogotá line and the visitor's line, so the two can never disagree on rules.
 */
export function formatInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

/** Short "6:00 p. m." label for slot buttons. */
export function formatTimeInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

/** "miércoles, 17 de junio" for a Bogotá calendar date. */
export function formatLongDate(iso: ISODate): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
