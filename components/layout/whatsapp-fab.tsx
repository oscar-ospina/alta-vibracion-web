"use client";

import { track } from "@vercel/analytics";
import { whatsappUrl } from "@/lib/site";

/**
 * Floating WhatsApp click-to-chat button (stories oscar-ospina/saas-planner#23 / #36):
 * fixed bottom-right on every route. Renders the brand WhatsApp icon from the Figma
 * design (`/whatsapp-icon.svg`, the export of node 817:19454: gradient #60FD7C→#26D044
 * + official glyph) instead of a flat #25D366 fill + Lucide glyph. Figma geometry:
 * 80px, 20px from the right and bottom edges, no shadow. Figma draws it inside the
 * home hero only; here it is fixed on every route.
 * Deliberate deviation: 56px below 768px (80px from md). The home hero's primary CTA
 * ("Quiero mi primera sesión", plan V2.1, not in the Figma hero) ends 309px from the
 * left edge on phones; at 80px the button covered its end in a 390px viewport, at
 * 56px its column clears the CTA from 385px wide up. On narrower phones, and for any
 * full-width row, it can still cover the end of what the page scrolls under it.
 * The hover scale is motion-safe only.
 * The icon green vs the page is low-contrast (#26d044 on #f6f6f9 is 1.9:1), so
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
      className="fixed bottom-5 right-5 z-50 inline-flex size-14 rounded-full ring-1 ring-black/50 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:transition-transform motion-safe:hover:scale-105 md:size-20"
    >
      {/* Static, trusted brand SVG with a baked-in gradient — plain <img> keeps it its
          own document (no next/image dangerouslyAllowSVG, no gradient-id collisions). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/whatsapp-icon.svg"
        alt=""
        aria-hidden
        width={80}
        height={80}
        className="size-full rounded-full"
      />
    </a>
  );
}
