"use client";

import { useMemo } from "react";
import { Label, cn } from "@saas/ui";

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

/** The zones most of Liliana's clients are in, listed first. */
const COMMON = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
];

export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota";
  } catch {
    return "America/Bogota";
  }
}

/**
 * Time-zone picker for the booking form. It deliberately wears the DS Input's
 * resting look (44px tall, 8px radius, 1px border-input outline, transparent
 * fill, 16px side padding, 16px text dropping to 14px from md up) because the
 * name and contact Inputs it shares the form with live in agenda-flow.tsx,
 * which stays on the DS style until its open PRs land. The kit's select (Figma
 * 789:28085: borderless neutral-50 fill, 40px tall, 24px chevron icon) arrives
 * with the kit restyle of the whole form, together with agenda-flow.tsx. Focus
 * shows the 3px orange outline of the form's other custom controls: the DS
 * Input's box-shadow focus ring does not render in this app (the Input only
 * turns its border orange), the same gap app/brand.css patches for the DS
 * Button. A native <select> keeps the browser's chevron.
 */
export function TimeZoneSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (tz: string) => void;
}) {
  const zones = useMemo(() => {
    let all: string[] = [];
    try {
      all = Intl.supportedValuesOf("timeZone");
    } catch {
      all = [];
    }
    const rest = all.filter((z) => !COMMON.includes(z));
    const list = [...COMMON, ...rest];
    return list.includes(value) ? list : [value, ...list];
  }, [value]);

  return (
    <div>
      <Label htmlFor={id}>Tu zona horaria</Label>
      <select
        id={id}
        name="clientTimeZone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-2 h-11 w-full rounded-lg border border-input bg-transparent px-4 text-base text-foreground shadow-xs md:text-sm",
          FOCUS_RING,
        )}
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
