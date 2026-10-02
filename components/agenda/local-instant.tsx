"use client";

import { useSyncExternalStore } from "react";
import { BOGOTA, formatInZone } from "@/lib/agenda/time";
import { detectTimeZone } from "@/components/agenda/timezone-select";

const subscribeNoop = () => () => {};

/**
 * An instant in Colombia time and, when the visitor is elsewhere, in their
 * own zone too (plan section 5: campaign opening and closing instants must
 * be unambiguous in Colombia and local time). Server HTML shows Bogotá only;
 * the browser's zone appears after hydration.
 */
export function LocalInstant({ at }: { at: string }) {
  const zone = useSyncExternalStore(subscribeNoop, detectTimeZone, () => BOGOTA);
  const instant = new Date(at);
  return (
    <span data-testid="local-instant">
      {formatInZone(instant, BOGOTA)} (Colombia)
      {zone !== BOGOTA && (
        <>
          {" · "}
          {formatInZone(instant, zone)} ({zone})
        </>
      )}
    </span>
  );
}
