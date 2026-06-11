"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { Button } from "@saas/ui";
import { ROUTES } from "@/lib/site";

/**
 * CTA into the in-app Agenda (story oscar-ospina/saas-planner#45). Replaces the
 * direct-WhatsApp BookingButton on the hero and the consultations grid: those
 * entry points now navigate to /agenda (optionally preselecting the cita) and
 * fire an `open_agenda` funnel event; the `book_consultation` conversion now
 * fires at the end of the flow, on the WhatsApp handoff (source: "agenda").
 * Same fire-and-forget pattern as BookingButton — never blocks navigation.
 */

export type AgendaSource = "hero" | "consultation";

type AgendaCtaProps = {
  source: AgendaSource;
  /** Preselect a consultation in the flow (renders /agenda?cita=<id>). */
  citaId?: number;
  /** Extra event properties, e.g. the consultation name. */
  eventProps?: Record<string, string>;
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export function AgendaCta({
  source,
  citaId,
  eventProps,
  size,
  className,
  children,
  "aria-label": ariaLabel,
}: AgendaCtaProps) {
  const href =
    citaId === undefined ? ROUTES.agenda : `${ROUTES.agenda}?cita=${citaId}`;
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
