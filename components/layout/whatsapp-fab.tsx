"use client";

import { track } from "@vercel/analytics";
import { whatsappUrl } from "@/lib/site";

/**
 * Floating WhatsApp click-to-chat button (stories oscar-ospina/saas-planner#23 / #36):
 * fixed bottom-right on every route. Renders the brand WhatsApp icon from the Figma
 * design (`/whatsapp-icon.svg` — gradient #60FD7C→#26D044 + official glyph) instead of
 * a flat #25D366 fill + Lucide glyph. The icon green vs the page is low-contrast, so
 * `ring-black/50` (≈3.9:1) supplies the WCAG 1.4.11 control boundary; the green + white
 * glyph is a brand identifier ("essential" exception).
 *
 * Client island: fires a tracked `book_consultation` conversion event (source "fab")
 * fire-and-forget on click — no preventDefault, so navigation proceeds (story #22).
 */
export function WhatsappFab() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      onClick={() => track("book_consultation", { source: "fab" })}
      className="fixed bottom-6 right-6 z-50 inline-flex size-14 rounded-full shadow-lg ring-1 ring-black/50 transition-transform hover:scale-105 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* Static, trusted brand SVG with a baked-in gradient — plain <img> keeps it its
          own document (no next/image dangerouslyAllowSVG, no gradient-id collisions). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/whatsapp-icon.svg"
        alt=""
        aria-hidden
        width={56}
        height={56}
        className="size-full rounded-full"
      />
    </a>
  );
}
