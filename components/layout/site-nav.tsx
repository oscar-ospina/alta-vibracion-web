"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Gift, Menu, X } from "lucide-react";
import { Button, cn } from "@saas/ui";
import { LINES } from "@/lib/catalog";
import { ROUTES } from "@/lib/site";

/**
 * Main navigation (plan section 3): Inicio / Yo · 7 / Nosotros · 2 /
 * Celebremos · 9 / Empresas / Regalar una cita, plus the two CTAs. From xl the
 * links sit inline in the top bar; below that a disclosure button opens a panel
 * with the links and, below lg, both CTAs, so "Regalar una cita" is one tap
 * away on a phone (plan section 7.1, "Menú principal y móvil"). The widths
 * were chosen against the rendered bar: at 1024 the inline links plus both
 * buttons overflow.
 *
 * Client island for the open/closed state only. The panel closes on navigation
 * and on Escape.
 */

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

const LINE_LINKS = [
  { href: ROUTES.home, label: "Inicio" },
  ...LINES.map((l) => ({ href: l.path, label: l.navLabel })),
];
const GIFT_LINK = { href: ROUTES.gift, label: "Regalar una cita" };
/** Desktop shows the gift as the outline button next to the links; the panel lists it too. */
const NAV_LINKS = [...LINE_LINKS, GIFT_LINK];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  // The panel is open only for the path it was opened on, so navigating
  // closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => setOpenFor(next ? pathname : null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (href: string) =>
    cn(
      "whitespace-nowrap rounded-md px-2 py-1 text-sm font-semibold transition-colors hover:text-brand-ink",
      FOCUS_RING,
      isCurrent(pathname, href) ? "text-brand-ink" : "text-foreground",
    );

  return (
    <>
      {/* Desktop links. */}
      <nav aria-label="Principal" className="hidden xl:block">
        <ul className="flex items-center gap-1">
          {LINE_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={linkClass(l.href)}
                aria-current={isCurrent(pathname, l.href) ? "page" : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="hidden whitespace-nowrap lg:inline-flex">
          <Link href={ROUTES.gift}>
            <Gift className="size-4" aria-hidden />
            Regalar una cita
          </Link>
        </Button>
        <Button asChild size="sm" className="whitespace-nowrap">
          <Link href={ROUTES.agenda}>
            <Calendar className="size-4" aria-hidden />
            <span className="hidden sm:inline">Quiero mi primera sesión</span>
            <span className="sm:hidden">Mi primera sesión</span>
          </Link>
        </Button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen(!open)}
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-orange-50 xl:hidden",
            FOCUS_RING,
          )}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Mobile panel. Rendered only while open so it never traps focus hidden. */}
      {open && (
        <nav
          id={panelId}
          aria-label="Principal"
          data-testid="mobile-nav"
          className="absolute inset-x-0 top-16 border-b border-neutral-100 bg-card shadow-lg xl:hidden"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-6">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(linkClass(l.href), "block px-2 py-3 text-base")}
                  aria-current={isCurrent(pathname, l.href) ? "page" : undefined}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2 border-t border-neutral-100 pt-4 lg:hidden">
              <Button asChild size="lg">
                <Link href={ROUTES.agenda}>
                  <Calendar className="size-5" aria-hidden />
                  Quiero mi primera sesión
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={ROUTES.gift}>
                  <Gift className="size-5" aria-hidden />
                  Regalar una cita
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
