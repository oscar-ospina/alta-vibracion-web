import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ROUTES, SOCIAL } from "@/lib/site";

const LEGAL_LINKS = [
  { href: ROUTES.contact, label: "Contacto" },
  { href: ROUTES.terms, label: "Términos de Uso" },
  { href: ROUTES.privacy, label: "Política de Privacidad" },
];

const linkClass =
  "inline-flex rounded-md transition-colors hover:text-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Site footer on every route (stories oscar-ospina/saas-planner#21 / #36). Faithful to
 * the Figma design: logo + "Síguenos" social row · divider · legal links + copyright.
 * The contact channels (correo / teléfono / WhatsApp) live on the /contact page (linked
 * here) and the WhatsApp FAB — the footer mirrors the design's social-first layout
 * rather than duplicating the contact icons. Server component.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-neutral-100 bg-card pb-16">
      {/* pb-16 reserves room for the fixed WhatsApp FAB (#23) at the bottom-right. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        {/* Row 1: logo + "Síguenos" / social */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-4">
          <Logo variant="horizontal" className="h-[30px] w-auto" />

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">Síguenos</span>
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Síguenos en Instagram"
              className={`${linkClass} transition-transform hover:scale-105`}
            >
              {/* Brand social glyph from Figma — self-contained #3D3F4F circle + mark.
                  Plain <img> keeps the SVG its own document (no gradient-id clashes). */}
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

        <hr className="border-neutral-100" />

        {/* Row 2: legal links (prominent — foreground/16px per Figma node 182:3933,
            Body/B1 Regular #363744) + recessed copyright (Body/B2, muted). */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-4">
          <nav
            aria-label="Enlaces legales"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-base"
          >
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${linkClass} text-foreground hover:underline`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground">
            © 2026 Alta Vibración. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
