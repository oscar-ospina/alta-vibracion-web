"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { Button } from "@saas/ui";
import { ROUTES } from "@/lib/site";

/**
 * Every entry into /regalar (plan section 7.1 wants it on the home, the
 * menu, the Mi Mapa 729 page and Celebremos). Fires an `open_gift` funnel
 * event with its source; fire-and-forget, so navigation proceeds and the
 * anchor still SSRs.
 */
export type GiftSource = "top_bar" | "nav" | "hero" | "card" | "service_page" | "gift_block";

export function GiftCta({
  source,
  size,
  variant = "outline",
  className,
  children,
  "aria-label": ariaLabel,
}: {
  source: GiftSource;
  size?: ComponentProps<typeof Button>["size"];
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <Link href={ROUTES.gift} aria-label={ariaLabel} onClick={() => track("open_gift", { source })}>
        {children}
      </Link>
    </Button>
  );
}
