"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { Button } from "@saas/ui";
import { ROUTES } from "@/lib/site";
import type { ServiceId } from "@/lib/catalog";

/**
 * CTA into the in-app Agenda. Every entry point navigates to /agenda
 * (optionally preselecting the consultation) and fires an `open_agenda` funnel
 * event with its source; the `book_consultation` conversion fires at the end of
 * the flow, on the WhatsApp handoff (source: "agenda"). Fire-and-forget: the
 * click never blocks navigation and the anchor still SSRs.
 */

export type AgendaSource = "hero" | "consultation" | "top_bar" | "nav";

type AgendaCtaProps = {
  source: AgendaSource;
  /** Preselect a consultation in the flow (renders /agenda?consultation=<id>). */
  consultationId?: ServiceId;
  /** Extra event properties, e.g. the consultation name. */
  eventProps?: Record<string, string>;
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export function AgendaCta({
  source,
  consultationId,
  eventProps,
  size,
  className,
  children,
  "aria-label": ariaLabel,
}: AgendaCtaProps) {
  const href =
    consultationId === undefined
      ? ROUTES.agenda
      : `${ROUTES.agenda}?consultation=${consultationId}`;
  return (
    <Button size={size} asChild className={className}>
      <Link
        href={href}
        aria-label={ariaLabel}
        onClick={() => track("open_agenda", { source, ...eventProps })}
      >
        {children}
      </Link>
    </Button>
  );
}
