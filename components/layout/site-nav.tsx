"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Gift, Menu, X } from "lucide-react";
import { cn } from "@saas/ui";
import { AgendaCta } from "@/components/brand/agenda-cta";
import { GiftCta } from "@/components/brand/gift-cta";
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
 * `transparent`: the bar is over the dark home hero (see TopBar), so the inline
 * links turn light (#f6f6f9, current page and hover Orange/300 #f8ad79) and so
 * does the menu toggle. The CTAs keep their colors. TopBar's no-JavaScript style
 * finds those two by `nav a` and `button[aria-controls]` inside the header, so
 * keep that markup or update the style with it. `fade`: TopBar says when a switch
 * between the two looks may cross-fade; otherwise the bar links and the toggle
 * change color instantly, hover included, so they never fade in light over a
 * light bar.
 *
 * The panel is the solid bar's surface (page color, Surfaces/s2 hairline), and
 * TopBar turns the bar solid while it is open, so bar and panel read as one sheet
 * even when opened over the hero. A soft ink shadow (surface-ink at 25%, 12px
 * below the edge) marks where it ends. It is needed because the panel covers the
 * page in the page's own color: on the inner pages, with the hairline alone, the
 * panel read as part of the page, with the white cards under it cut off. Its
 * links' text starts on the bar's gutter, under the logo (`-mx-2` cancels their
 * padding, which stays as tap area and focus-ring room).
 *
 * Both bar CTAs are Figma's Medium button (8:695, Size=Medium): 41px tall, 9.5px
 * side padding, an 18px label on a 25px line, no shadow; the outline gift button
 * gives 1px of padding to its border to stay the same size. Figma's button has no
 * icon, so phones show the short label alone (16px below 340px, so the bar fits at
 * 320px); the calendar icon returns from sm.
 *
 * TopBar owns the open state (the bar's look depends on it) and closes the panel
 * on navigation; this component closes it on Escape and on a same-path tap.
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

export function SiteNav({
  open,
  onOpenChange,
  transparent = false,
  fade = false,
  gutterClassName,
}: {
  /** Whether the menu panel is open (state owned by TopBar). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The bar has no fill over the home hero: light bar links and toggle. */
  transparent?: boolean;
  /** The bar links and toggle cross-fade with the bar when their look switches. */
  fade?: boolean;
  /** The bar's side padding, so the panel links line up with the logo. */
  gutterClassName?: string;
}) {
  const pathname = usePathname();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const barTransition = fade && "motion-safe:transition-colors";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onOpenChange(false);
      // The panel unmounts with focus inside it; hand focus back to the toggle (WCAG 2.4.3).
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const linkClass = (href: string, onHero = false) =>
    cn(
      "whitespace-nowrap rounded-md px-2 py-1 text-sm font-semibold",
      FOCUS_RING,
      onHero
        ? ["hover:text-orange-300", isCurrent(pathname, href) ? "text-orange-300" : "text-neutral-50"]
        : ["hover:text-brand-ink", isCurrent(pathname, href) ? "text-brand-ink" : "text-foreground"],
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
                className={cn(linkClass(l.href, transparent), barTransition)}
                aria-current={isCurrent(pathname, l.href) ? "page" : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <GiftCta
          source="top_bar"
          className="hidden whitespace-nowrap px-[8.5px] py-[7px] leading-[25px] shadow-none lg:inline-flex"
        >
          <Gift className="size-5" aria-hidden />
          Regalar una cita
        </GiftCta>
        <AgendaCta
          source="top_bar"
          className="whitespace-nowrap px-[9.5px] leading-[25px] shadow-none max-[340px]:text-base"
        >
          <Calendar className="hidden size-5 sm:block" aria-hidden />
          <span className="hidden sm:inline">Quiero mi primera sesión</span>
          <span className="sm:hidden">Mi primera sesión</span>
        </AgendaCta>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-md xl:hidden",
            FOCUS_RING,
            barTransition,
            transparent ? "text-neutral-50 hover:bg-white/10" : "text-foreground hover:bg-orange-50",
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
          className="absolute inset-x-0 top-16 border-b border-surface-ink/8 bg-background shadow-[0_12px_24px_-12px] shadow-surface-ink/25 xl:hidden"
        >
          <ul className={cn("flex flex-col py-3", gutterClassName)}>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(linkClass(l.href), "-mx-2 block px-2 py-3 text-base motion-safe:transition-colors")}
                  aria-current={isCurrent(pathname, l.href) ? "page" : undefined}
                  // Same-path taps do not change the pathname, so close by hand.
                  onClick={() => onOpenChange(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2 border-t border-surface-ink/8 pt-4 lg:hidden">
              <AgendaCta source="nav" size="lg">
                <Calendar className="size-5" aria-hidden />
                Quiero mi primera sesión
              </AgendaCta>
              <GiftCta source="nav" size="lg">
                <Gift className="size-5" aria-hidden />
                Regalar una cita
              </GiftCta>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
