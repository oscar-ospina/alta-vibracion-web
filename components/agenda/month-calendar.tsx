"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@saas/ui";
import {
  type ISODate,
  type MonthCursor,
  formatLongDate,
  monthGridDates,
  monthLabel,
} from "@/lib/agenda";

/**
 * Month grid for the Agenda (story oscar-ospina/saas-planner#45), after the
 * design kit's calendar: Monday-based, bookable days get the orange tint, the
 * selected day inverts. Selected uses brand-ink (orange-700) — not the kit's
 * orange-400 — so the white day number keeps WCAG AA contrast (~5.8:1).
 *
 * Plain buttons (full date in each aria-label) rather than a roving-focus grid:
 * tab order walks the bookable days only, since the rest are disabled.
 */

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

// Visual header only — screen readers get full dates from the day buttons.
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

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

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-lg font-semibold text-foreground">
          {label}
        </span>
        <span className="flex gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Mes anterior"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-foreground transition-colors hover:bg-orange-50 disabled:pointer-events-none disabled:text-neutral-300",
              FOCUS_RING,
            )}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Mes siguiente"
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 text-foreground transition-colors hover:bg-orange-50 disabled:pointer-events-none disabled:text-neutral-300",
              FOCUS_RING,
            )}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            aria-hidden
            className="py-1 text-center text-[11px] font-semibold text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
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
                "aspect-square rounded-lg text-sm transition-colors",
                FOCUS_RING,
                isSelected
                  ? "bg-brand-ink font-semibold text-white"
                  : bookable
                    ? "bg-orange-50 font-semibold text-orange-700 hover:bg-orange-100"
                    : "text-neutral-300",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
