"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@saas/ui";
import { ROUTES } from "@/lib/site";

/** Private sections. Add a new admin page here and it shows on every admin screen. */
const ADMIN_LINKS = [
  { href: "/admin", label: "Reservas" },
  { href: "/admin/schedule", label: "Horarios y vacaciones" },
  { href: "/admin/interests", label: "Intereses" },
  { href: "/admin/script", label: "Guion" },
] as const;

/** Public pages, to check what clients see. They open in a new tab. */
const PUBLIC_LINKS = [
  { href: ROUTES.home, label: "Inicio" },
  { href: ROUTES.agenda, label: "Agenda" },
  { href: ROUTES.yo, label: "Yo" },
  { href: ROUTES.nosotros, label: "Nosotros" },
  { href: ROUTES.celebremos, label: "Celebremos" },
  { href: ROUTES.empresas, label: "Empresas" },
  { href: ROUTES.gift, label: "Regalar" },
  { href: ROUTES.contact, label: "Contacto" },
  { href: ROUTES.terms, label: "Términos" },
  { href: ROUTES.privacy, label: "Privacidad" },
] as const;

const PILL =
  "rounded-full px-3 py-1 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Navigation shared by every /admin page. Never linked from the public site. */
export function AdminNav() {
  const pathname = usePathname();
  const current = (href: string) =>
    href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/bookings") : pathname.startsWith(href);
  return (
    <nav aria-label="Administración" className="border-b bg-muted/40" data-testid="admin-nav">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 text-sm sm:px-6 lg:px-10">
        <ul className="flex flex-wrap items-center gap-1">
          <li className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Panel</li>
          {ADMIN_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={current(l.href) ? "page" : undefined}
                className={cn(PILL, current(l.href) ? "bg-brand-ink font-semibold text-white" : "text-brand-ink hover:underline")}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap items-center gap-1">
          <li className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sitio</li>
          {PUBLIC_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener" className={cn(PILL, "text-muted-foreground hover:text-foreground hover:underline")}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
