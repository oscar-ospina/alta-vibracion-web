import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ROUTES, whatsappUrl } from "@/lib/site";

const LEGAL_LINKS = [
  { href: ROUTES.contact, label: "Contacto" },
  { href: ROUTES.terms, label: "Términos de Uso" },
  { href: ROUTES.privacy, label: "Política de Privacidad" },
];

const linkClass =
  "inline-flex rounded-md transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// Icon-only links: pad to a ≥24×24 tap target (WCAG 2.5.8) so it doesn't rely on
// the spacing exception, and reads better on touch. 20px icon + p-2 (16px) = 36px.
const iconLinkClass = `${linkClass} p-2`;

/**
 * Site footer on every route (story oscar-ospina/saas-planner#21): brand logo,
 * legal/contact links, and a contact icon row. WhatsApp is wired; mail/phone
 * point to the contact page until the real email/phone land (#26). Server component.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-neutral-100 bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-7 sm:flex-row sm:justify-between sm:gap-4 sm:px-6 lg:px-10">
        <Logo variant="horizontal" className="h-[30px] w-auto" />

        <nav
          aria-label="Enlaces legales y de contacto"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
        >
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ))}
        </nav>

        <ul className="-mr-2 flex items-center gap-1 text-muted-foreground">
          <li>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escríbenos por WhatsApp"
              className={iconLinkClass}
            >
              <MessageCircle className="size-5" aria-hidden />
            </a>
          </li>
          <li>
            <Link href={ROUTES.contact} aria-label="Correo de contacto" className={iconLinkClass}>
              <Mail className="size-5" aria-hidden />
            </Link>
          </li>
          <li>
            <Link href={ROUTES.contact} aria-label="Teléfono de contacto" className={iconLinkClass}>
              <Phone className="size-5" aria-hidden />
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
