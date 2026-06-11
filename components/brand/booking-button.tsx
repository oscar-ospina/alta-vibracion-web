"use client";

import type { ComponentProps, ReactNode } from "react";
import { track } from "@vercel/analytics";
import { Button } from "@saas/ui";
import { whatsappUrl } from "@/lib/site";

/**
 * Direct-WhatsApp booking CTA, with a conversion event (story
 * oscar-ospina/saas-planner#22). Since #45 only the TOP BAR uses it — the hero
 * and per-cita cards moved to AgendaCta (→ /agenda); the FAB tracks separately
 * (source "fab", different markup) and the Agenda flow fires `book_consultation`
 * with source "agenda" on its WhatsApp handoff.
 *
 * Client island: `track()` is fire-and-forget in onClick — we never
 * preventDefault or await, so navigation proceeds normally (it's a beacon) and
 * the anchor still SSRs, keeping the link crawlable.
 */

/** Where the direct-WhatsApp booking intent originated — attributed in analytics. */
export type BookingSource = "top_bar";

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
