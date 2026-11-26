/**
 * Pure helpers for the schedule screen (/admin/schedule): weekly rule checks,
 * vacation ranges and the grouping of closed days. No database import, so the
 * unit tests in tests/unit run without Postgres.
 */
import type { AvailabilityOverride, AvailabilityRule } from "@/db/schema";
import { HHMM_RE, ISO_DATE_RE, type HHMM, type ISODate, addDays } from "./time";

/** Spanish weekday names, indexed like `availability_rules.weekday` (0 = Sunday). */
export const WEEKDAY_LABEL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Monday first, the order Liliana reads a week in. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Protected length of an extra hour when no active rule gives one (plan section 7). */
export const DEFAULT_DURATION_MINUTES = 135;
export const MIN_DURATION_MINUTES = 30;
export const MAX_DURATION_MINUTES = 300;
/** Longest range one vacation form may close. */
export const MAX_CLOSURE_DAYS = 120;

type RuleShape = Pick<AvailabilityRule, "weekday" | "time" | "durationMinutes">;

function minutesOf(time: HHMM): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export type RuleError = "bad_weekday" | "bad_time" | "bad_duration";

/** Checks one weekly rule. A slot must end the same day, before midnight. */
export function validateRule(rule: RuleShape): RuleError | null {
  if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) return "bad_weekday";
  if (!HHMM_RE.test(rule.time)) return "bad_time";
  const d = rule.durationMinutes;
  if (!Number.isInteger(d) || d < MIN_DURATION_MINUTES || d > MAX_DURATION_MINUTES) return "bad_duration";
  if (minutesOf(rule.time) + d > 24 * 60) return "bad_duration";
  return null;
}

/** True when two rules of the same weekday share any minute. */
export function rulesOverlap(a: RuleShape, b: RuleShape): boolean {
  if (a.weekday !== b.weekday) return false;
  const as = minutesOf(a.time);
  const bs = minutesOf(b.time);
  return as < bs + b.durationMinutes && as + a.durationMinutes > bs;
}

/** The active rules a candidate would clash with (same day, overlapping time). */
export function clashingRules<T extends RuleShape & { id: number; active: boolean }>(
  candidate: RuleShape & { id?: number },
  rules: T[],
): T[] {
  return rules.filter((r) => r.active && r.id !== candidate.id && rulesOverlap(candidate, r));
}

/**
 * Length for a new extra hour: the most common duration among active rules,
 * so an extra morning protects the same time as a regular evening.
 */
export function extraDuration(rules: Pick<AvailabilityRule, "durationMinutes" | "active">[]): number {
  const counts = new Map<number, number>();
  for (const r of rules) if (r.active) counts.set(r.durationMinutes, (counts.get(r.durationMinutes) ?? 0) + 1);
  let best = DEFAULT_DURATION_MINUTES;
  let bestCount = 0;
  for (const [d, c] of counts) {
    if (c > bestCount || (c === bestCount && d < best)) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

/** A real calendar date: 2026-02-31 matches the regex but is not one. */
export function isRealDate(iso: string): boolean {
  return ISO_DATE_RE.test(iso) && addDays(iso, 0) === iso;
}

export type RangeError = "bad_date" | "bad_range" | "range_too_long";

/** Every date from `from` to `to`, both included, or the reason it can't be. */
export function datesInRange(from: string, to: string): ISODate[] | RangeError {
  if (!isRealDate(from) || !isRealDate(to)) return "bad_date";
  if (from > to) return "bad_range";
  const dates: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    dates.push(d);
    if (dates.length > MAX_CLOSURE_DAYS) return "range_too_long";
  }
  return dates;
}

export type Closure = {
  from: ISODate;
  to: ISODate;
  days: number;
  note: string | null;
  ids: number[];
};

/**
 * Full-day closures merged into ranges: consecutive dates with the same note
 * become one row, so two weeks of vacation read as one line with one button.
 */
export function groupClosures(
  overrides: Pick<AvailabilityOverride, "id" | "date" | "kind" | "time" | "note">[],
): Closure[] {
  const days = overrides
    .filter((o) => o.kind === "closed" && o.time === null)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  const out: Closure[] = [];
  for (const o of days) {
    const last = out.at(-1);
    if (last && last.note === o.note && (o.date === last.to || o.date === addDays(last.to, 1))) {
      if (o.date !== last.to) last.days += 1;
      last.to = o.date;
      last.ids.push(o.id);
    } else {
      out.push({ from: o.date, to: o.date, days: 1, note: o.note, ids: [o.id] });
    }
  }
  return out;
}

/** "Lunes a jueves, 18:00" style summary of the active rules, for page copy. */
export function describeRules(rules: Pick<AvailabilityRule, "weekday" | "time" | "active">[]): string {
  const active = rules.filter((r) => r.active);
  if (active.length === 0) return "sin horarios activos";
  const byTime = new Map<HHMM, number[]>();
  for (const r of active) byTime.set(r.time, [...(byTime.get(r.time) ?? []), r.weekday]);
  return [...byTime]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([time, days]) => {
      const names = WEEKDAY_ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAY_LABEL[d].toLowerCase());
      const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : names[0];
      return `${list} a las ${time}`;
    })
    .join("; ");
}
