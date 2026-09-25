"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@saas/ui";
import { Logo } from "@/components/brand/logo";
import { SiteNav } from "@/components/layout/site-nav";
import { ROUTES } from "@/lib/site";

/** The header's height (`h-16`). */
const BAR_HEIGHT_PX = 64;
const HOME_GUTTER = "px-5 min-[360px]:px-8 desktop:px-[84px]";
const PAGE_GUTTER = "px-5 desktop:px-10";

/**
 * Where the home is scrolled, as far as the bar cares: at the very top, within
 * the bar's height of it, or further down. The look depends only on `top`;
 * `near` versus `far` decides whether a switch fades. A small scroll away from the
 * top lands in `near` and fades; a larger step, or a jump to a restored or
 * anchored position, lands in `far` and swaps instantly.
 */
type ScrollZone = "top" | "near" | "far";

function readScrollZone(): ScrollZone {
  const y = window.scrollY;
  // `<= 0`: iOS rubber-banding above the top reports a negative scrollY.
  if (y <= 0) return "top";
  return y <= BAR_HEIGHT_PX ? "near" : "far";
}

/** The server renders the page top, and so do routes that ignore the scroll. */
const readTop = (): ScrollZone => "top";

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const subscribeToNothing = () => () => {};

/**
 * The home's scroll zone. useSyncExternalStore reads it during render and
 * re-renders synchronously on a scroll event that changes it, so the painted
 * look always matches the scroll, with no observer callback a frame later; that
 * includes a route change into "/" at a restored scroll. The server snapshot is
 * the top, and after hydration React re-renders if the real scroll differs.
 * Other routes do not listen.
 */
function useHomeScrollZone(isHome: boolean): ScrollZone {
  return useSyncExternalStore(
    isHome ? subscribeToScroll : subscribeToNothing,
    isHome ? readScrollZone : readTop,
    readTop,
  );
}

/**
 * Without JavaScript nothing turns the home bar solid on scroll, so this style
 * keeps it solid: keyed on the header's `data-over-hero`, it repaints the header
 * and SiteNav's inline links and menu toggle in the solid look, with the theme
 * variables behind the solid look's utilities. Unlayered, so it beats Tailwind's
 * `@layer utilities` without `!important`. With scripting on, the browser parses
 * <noscript> as inert text and React does not hydrate its children.
 */
const NO_SCRIPT_SOLID_BAR = [
  "[data-over-hero]{background-color:var(--color-background);border-bottom-color:color-mix(in oklab,var(--color-surface-ink) 8%,transparent)}",
  "[data-over-hero] nav a,[data-over-hero] button[aria-controls]{color:var(--color-foreground)}",
  "[data-over-hero] nav a:is(:hover,[aria-current=page]){color:var(--color-brand-ink)}",
].join("");

/**
 * Sticky top bar on every route (Figma "top bar", master 8:701): the logo mark
 * (→ Home), the main navigation and the two CTAs from the plan (section 3):
 * "Quiero mi primera sesión" into the agenda and "Regalar una cita" into /regalar.
 * Figma draws only the mark and one button; the links, the gift CTA and the menu
 * toggle are plan V2.1 content (see SiteNav).
 *
 * Two looks, both from Figma:
 * - Over the home hero (instance 182:3938): no fill and no stroke, with SiteNav's
 *   bar links and toggle light. Only while the home is at the very top: the hero
 *   pulls itself up under the bar (`-mt-16`), so the photo starts at the page top,
 *   and the first scroll turns the bar solid, so once the page is hydrated no
 *   content scrolls under a transparent bar. "/" server-renders this look, so the
 *   page does not flash a light bar before hydration. Without JavaScript a <noscript> style keeps the
 *   home bar solid, over the top 64px of the photo.
 * - Everywhere else, on the home once it scrolls, and while the menu panel is
 *   open (bar and panel then read as one surface): the page color with a bottom
 *   hairline, Figma's Surfaces/s2 (surface-ink at 8%; agenda instance 776:12024).
 *   Figma has no scrolled state for the home; it reuses the inner-page bar.
 * The border is always drawn (transparent over the hero), so both looks are
 * exactly 64px including it and nothing moves when they swap. The header carries
 * `data-over-hero` while it is transparent, as a hook for tests and for the
 * no-JavaScript style.
 *
 * The looks cross-fade (150ms, motion-safe) only on the home while it is within
 * the bar's height of the top, where the photo is under the bar: a scroll away
 * from the top or back to it, a route change into the home, the menu toggle.
 * A route change to another page, or a jump to a restored or anchored position
 * further down (a reload or back/forward, whose first paint is the server's
 * transparent bar), swaps instantly, so light links never fade over a light page.
 *
 * The mark alone at every width, about 61x37 (logo instance 8:694); the wordmark
 * lockup lives in the footer. The row is full-bleed, with Figma's gutters: home
 * 84px from 950px and 32px below; other routes 40px from 950px and 20px in the
 * 768 frame. Deliberate deviations, because Figma's phone bars hold at most the
 * logo and one button while ours also has the menu toggle: other routes keep 20px
 * below 768 (Figma: 40px), the home drops to 20px below 360px, and SiteNav's CTA
 * label drops to 16px below 340px, so the row fits down to 320px (WCAG 1.4.10).
 *
 * Client component: the look depends on the path, the scroll and the menu. It
 * owns the menu's open state (SiteNav renders the toggle and the panel), keyed by
 * the path it was opened on, so navigating closes it without an effect.
 */
export function TopBar() {
  const pathname = usePathname();
  const isHome = pathname === ROUTES.home;
  const zone = useHomeScrollZone(isHome);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === pathname;
  const overHero = isHome && zone === "top" && !menuOpen;
  const fade = isHome && zone !== "far";
  const gutter = isHome ? HOME_GUTTER : PAGE_GUTTER;

  return (
    <header
      data-over-hero={overHero ? "" : undefined}
      className={cn(
        "sticky top-0 z-40 h-16 border-b",
        fade && "motion-safe:transition-colors",
        overHero ? "border-transparent" : "border-surface-ink/8 bg-background",
      )}
    >
      <noscript>
        <style>{NO_SCRIPT_SOLID_BAR}</style>
      </noscript>
      <div className={cn("relative flex h-full items-center justify-between gap-3", gutter)}>
        <Link
          href="/"
          aria-label="Alta Vibración — Inicio"
          className="inline-flex shrink-0 rounded-md focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo variant="mark" href={null} className="h-[37px] w-auto" />
        </Link>

        <SiteNav
          open={menuOpen}
          onOpenChange={(open) => setMenuFor(open ? pathname : null)}
          transparent={overHero}
          fade={fade}
          gutterClassName={gutter}
        />
      </div>
    </header>
  );
}
