"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@saas/ui";
import { type ISODate, formatLongDate } from "@/lib/agenda/time";
import { type MonthCursor, monthGridDates, monthLabel } from "@/lib/agenda/calendar";

/**
 * Month grid for the Agenda, after the design kit's Calendar (Figma 745:14742):
 * a 300px block with a prev | month | next title row (24px arrow buttons with a
 * 1px chevron), three-letter weekday labels and Monday-based rows of 40x36 day
 * cells with 2px gaps (292px grid). The kit's day states map as follows:
 * - selected: State=current, orange-300 fill with orange-900 text (5.42:1);
 * - bookable: State=default, no fill, foreground text; neutral-100 on hover;
 * - not bookable: State=disabled, foreground at 30% (inactive, exempt from 1.4.3).
 * Adjacent-month dates fill the first and last rows in the disabled style, as
 * in the kit, but as aria-hidden text rather than buttons.
 *
 * The kit's type styles are Open Sans (Body/B2 for days and month, Body/B3 for
 * weekdays), so the month label drops Archivo. Deliberate deviations: the
 * weekday labels use neutral-500 (5.30:1) because the kit's #363744 at 60%
 * (3.57:1) fails AA at 12px; the kit's slate-950 text is harmonized to
 * text-foreground; the selected day adds a 1px orange-500 border (3.28:1 on the
 * white card) because its orange-300 fill alone is 1.87:1 there, short of the
 * 3:1 that WCAG 1.4.11 asks of a state indicator (the border also survives
 * forced-colors mode, where the fill is dropped); each arrow button's ::after
 * reaches 3px past its 24px box on every side (-inset-1 counts from inside the
 * 1px border), so the hit area is 30x30px, above the 24px box that already
 * meets the WCAG 2.5.8 minimum on its own.
 * As in the Figma, the block sits flush with the start of its panel, under the
 * panel heading; in a panel narrower than the 292px grid (viewports under
 * ~374px) the columns shrink instead of overflowing. The month label is a
 * polite live region, so changing month is announced.
 *
 * Plain buttons (full date in each aria-label) rather than a roving-focus grid:
 * tab order walks the bookable days only, since the rest are disabled. An arrow
 * disables itself when it reaches the first or last bookable month, which would
 * drop keyboard focus on the page; if it had focus, focus moves to the opposite
 * arrow instead. That arrow is always enabled at that point, because the step
 * has just moved away from the other end of the range; should it not be,
 * focus falls back to the first enabled day.
 */

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

const NAV_BUTTON =
  "relative inline-flex size-6 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors after:absolute after:-inset-1 hover:bg-neutral-100 disabled:pointer-events-none disabled:text-neutral-300";

// Visual header only — screen readers get full dates from the day buttons.
const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

const ADJACENT_DAY = "flex h-9 items-center justify-center text-sm text-foreground/30";

type MonthCalendarProps = {
  cursor: MonthCursor;
  selected: ISODate | null;
  isBookable: (date: ISODate) => boolean;
  onSelect: (date: ISODate) => void;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function MonthCalendar({
  cursor,
  selected,
  isBookable,
  onSelect,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: MonthCalendarProps) {
  const cells = monthGridDates(cursor);
  const label = monthLabel(cursor);
  // Leading nulls stand for the previous month's last days; trailing cells
  // complete the last row with the next month's first days.
  const leading = cells.filter((date) => date === null).length;
  const prevMonthDays = new Date(Date.UTC(cursor.year, cursor.month - 1, 0)).getUTCDate();
  const trailing = (7 - (cells.length % 7)) % 7;

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // The arrow that was just pressed while it held focus. Recorded at click time
  // because once disabled, browsers disagree on what document.activeElement is.
  const pressedArrow = useRef<"prev" | "next" | null>(null);

  const step = (arrow: "prev" | "next", button: HTMLButtonElement) => {
    pressedArrow.current = document.activeElement === button ? arrow : null;
    if (arrow === "prev") onPrev();
    else onNext();
  };

  // After a month step, hand focus on if the pressed arrow has just disabled
  // itself (see the component doc).
  useEffect(() => {
    const arrow = pressedArrow.current;
    pressedArrow.current = null;
    if (arrow === null || (arrow === "prev" ? canPrev : canNext)) return;
    const other = arrow === "prev" ? nextRef.current : prevRef.current;
    const target =
      other && !other.disabled
        ? other
        : gridRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    target?.focus();
  }, [cursor.year, cursor.month, canPrev, canNext]);

  return (
    <div className="w-full max-w-[300px]">
      <div className="mb-4 flex h-6 items-center justify-between px-2">
        <button
          ref={prevRef}
          type="button"
          onClick={(event) => step("prev", event.currentTarget)}
          disabled={!canPrev}
          aria-label="Mes anterior"
          className={cn(NAV_BUTTON, FOCUS_RING)}
        >
          <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
        <span aria-live="polite" className="text-body-b2-semibold text-foreground">
          {label}
        </span>
        <button
          ref={nextRef}
          type="button"
          onClick={(event) => step("next", event.currentTarget)}
          disabled={!canNext}
          aria-label="Mes siguiente"
          className={cn(NAV_BUTTON, FOCUS_RING)}
        >
          <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div ref={gridRef} className="grid w-full max-w-[292px] grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            aria-hidden
            className="flex h-6 items-center justify-center text-body-b3-regular text-neutral-500"
          >
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) {
            const day = prevMonthDays - leading + 1 + i;
            return (
              <div key={`prev-${day}`} aria-hidden className={ADJACENT_DAY}>
                {day}
              </div>
            );
          }
          const day = Number(date.slice(8));
          const bookable = isBookable(date);
          const isSelected = selected === date;
          return (
            <button
              key={date}
              type="button"
              disabled={!bookable}
              aria-pressed={isSelected}
              aria-label={
                bookable
                  ? formatLongDate(date)
                  : `${formatLongDate(date)} — no disponible`
              }
              onClick={() => onSelect(date)}
              className={cn(
                "h-9 rounded-md text-sm transition-colors",
                FOCUS_RING,
                isSelected
                  ? "border border-orange-500 bg-primary text-primary-foreground"
                  : bookable
                    ? "text-foreground hover:bg-neutral-100"
                    : "text-foreground/30",
              )}
            >
              {day}
            </button>
          );
        })}
        {Array.from({ length: trailing }, (_, i) => (
          <div key={`next-${i + 1}`} aria-hidden className={ADJACENT_DAY}>
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
