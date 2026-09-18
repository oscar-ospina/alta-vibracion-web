/** Month-grid helpers for the calendar widget. Pure, Bogotá calendar dates. */
import { type ISODate } from "./time";

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

/** Monday-based grid: leading nulls pad the first row, then one date per day. */
export function monthGridDates(cursor: MonthCursor): (ISODate | null)[] {
  const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const cells: (ISODate | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      new Date(Date.UTC(cursor.year, cursor.month - 1, d)).toISOString().slice(0, 10),
    );
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
  const label = monthFormat.format(new Date(Date.UTC(cursor.year, cursor.month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
