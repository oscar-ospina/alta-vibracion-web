"use client";

import type { ComponentProps, ReactNode } from "react";
import { track } from "@vercel/analytics";
import { Button } from "@saas/ui";
import { whatsappUrl } from "@/lib/site";

/**
 * Direct-WhatsApp CTA, with a conversion event (story
 * oscar-ospina/saas-planner#22). The hero and the catalog cards go to AgendaCta
 * (→ /agenda); this button remains for the manual paths: the gift inquiry and
 * the interest registration while their forms are not live, and the agenda
 * fallback. The FAB tracks separately (source "fab").
 *
 * Client island: `track()` is fire-and-forget in onClick — we never
 * preventDefault or await, so navigation proceeds normally (it's a beacon) and
 * the anchor still SSRs, keeping the link crawlable.
 */

/** Where the direct-WhatsApp booking intent originated — attributed in analytics. */
export type BookingSource = "gift" | "interest";

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
