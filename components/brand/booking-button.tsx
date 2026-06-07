"use client";

import type { ComponentProps, ReactNode } from "react";
import { track } from "@vercel/analytics";
import { Button } from "@saas/ui";
import { whatsappUrl } from "@/lib/site";

/**
 * Booking CTA → WhatsApp, with a conversion event (story oscar-ospina/saas-planner#22).
 *
 * Client island: wraps the existing `<Button asChild><a>` pattern shared by the hero,
 * top bar, and per-cita cards so each fires a tracked `book_consultation` event naming
 * its entry point. `track()` is fire-and-forget in onClick — we never preventDefault
 * or await, so navigation proceeds normally (it's a beacon) and the anchor still SSRs,
 * keeping the link crawlable. The FAB tracks separately (different markup, not a Button).
 */

/** Where the booking intent originated — attributed in analytics. */
export type BookingSource = "hero" | "top_bar" | "consultation";

type BookingButtonProps = {
  source: BookingSource;
  /** WhatsApp prefilled message; defaults to the generic booking intent. */
  message?: string;
  /** Extra event properties, e.g. the consultation name. */
  eventProps?: Record<string, string>;
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export function BookingButton({
  source,
  message,
  eventProps,
  size,
  className,
  children,
  "aria-label": ariaLabel,
}: BookingButtonProps) {
  return (
    <Button size={size} asChild className={className}>
      <a
        href={whatsappUrl(message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        onClick={() => track("book_consultation", { source, ...eventProps })}
      >
        {children}
      </a>
    </Button>
  );
}
