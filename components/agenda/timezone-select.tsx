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
          "mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground",
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
