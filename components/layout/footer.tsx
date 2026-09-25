import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ROUTES, SOCIAL } from "@/lib/site";

const LEGAL_LINKS = [
  { href: ROUTES.contact, label: "Contacto" },
  { href: ROUTES.terms, label: "Términos de Uso" },
  { href: ROUTES.privacy, label: "Política de Privacidad" },
];

const focusRing =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Figma "Button / States" Type=Tertiary, Size=Medium: 40px tall, 12px side padding,
 *  radius 8, Body/B1 Regular #363744, hover fill #ededf1 (neutral-100 = `muted`). */
const legalLinkClass = `inline-flex h-10 items-center rounded-lg px-3 text-body-b1-regular text-foreground transition-colors hover:bg-muted ${focusRing}`;

/**
 * Site footer on every route (stories oscar-ospina/saas-planner#21 / #36), built from
 * the Figma footer (182:3933 at 1440, 937:20097 at 767, 937:19516 at 350): logo +
 * "Síguenos" social row · divider · legal links + copyright.
 *
 * Fidelity: page color (#f6f6f9) with no top border or margin, so the last section's
 * own bottom padding is the only separation. 16px vertical padding and 8px gaps; the
 * side padding is `container-page` (96px from 950px, 32px below), and `max-md:px-8`
 * keeps Figma's 32px on phones, where the page sections use 20px. Logo 297×40
 * (286×38.5 below 768px). "Síguenos" is Body/B1 Regular with an 8px gap to the icon.
 * The divider is Figma's Surfaces ink (#272f4e, `surface-ink`) at 8%. Legal links are
 * Figma's Tertiary buttons (see `legalLinkClass`), 4px apart; the copyright (Body/B2)
 * follows 16px after them and wraps 16px below when the row runs out of room (below
 * about 1000px). Below 640px the social row drops under the logo and the links stack
 * one per line, as in the 350 frame; every row stays left-aligned.
 *
 * Deliberate deviations:
 * - Content is capped by `container-page` (1248px), aligned with the sections; the
 *   1920 frame lets the footer run to 1728px.
 * - Instagram only: TikTok comes back when the account launches (lib/site.ts SOCIAL).
 * - Copyright copy and color: our wording, and `muted-foreground` (#565973, 6.34:1 on
 *   the page) because Figma's #363744 at 60% is 3.48:1, below AA for 14px text.
 * - All three links use the Medium button padding; the 1440 frame gives "Contacto"
 *   the Small one (8px), the phone frames use Medium for all.
 * - `pb-[100px]` below the content reserves room for the fixed WhatsApp FAB (80px,
 *   20px from the bottom-right corner, so its top edge sits 100px above the viewport
 *   bottom): scrolled to the end, the last row stays 16px clear of it.
 *
 * The contact channels (correo / teléfono / WhatsApp) live on the /contact page (linked
 * here) and the WhatsApp FAB; the footer keeps the design's social-first layout
 * instead of repeating the contact icons. Server component.
 */
export function Footer() {
  return (
    <footer className="bg-background pb-[100px]">
      <div className="container-page flex flex-col gap-2 py-4 max-md:px-8">
        {/* Row 1: logo + "Síguenos" / social */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Width-driven so it can still shrink below the 350px frame. */}
          <Logo variant="horizontal" className="h-auto w-[286px] max-w-full md:w-[297px]" />

          <div className="flex items-center gap-2">
            <span className="text-body-b1-regular text-foreground">Síguenos</span>
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Síguenos en Instagram"
              className={`inline-flex rounded-full motion-safe:transition-transform motion-safe:hover:scale-105 ${focusRing}`}
            >
              {/* Brand social glyph from Figma (214:6987): self-contained #3D3F4F circle
                  + mark. Plain <img> keeps the SVG its own document (no gradient-id clashes). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/social-instagram.svg"
                alt=""
                aria-hidden
                width={32}
                height={32}
                className="size-8"
              />
            </a>
          </div>
        </div>

        <hr className="border-surface-ink/8" />

        {/* Row 2: legal links + copyright */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <nav
            aria-label="Enlaces legales"
            className="flex flex-col items-start gap-1 sm:flex-row sm:items-center"
          >
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={legalLinkClass}>
                {l.label}
              </Link>
            ))}
          </nav>

          <p className="text-body-b2-regular text-muted-foreground">
            © 2026 Alta Vibración. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
