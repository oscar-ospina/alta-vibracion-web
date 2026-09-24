import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SiteNav } from "@/components/layout/site-nav";

/**
 * Sticky top bar on every route: brand logo (→ Home), the main navigation and
 * the two CTAs from the plan (section 3): "Quiero mi primera sesión" into the
 * agenda and "Regalar una cita" into /regalar. The bar itself is a server
 * component; the nav's open/closed state is the only client island.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-card">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        {/* Logo → Home. Compact mark on mobile so the bar never overflows. */}
        <Link
          href="/"
          aria-label="Alta Vibración — Inicio"
          className="inline-flex shrink-0 rounded-md focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo variant="mark" href={null} className="h-8 w-auto md:hidden" />
          <Logo variant="horizontal" href={null} className="hidden h-9 w-auto md:block" />
        </Link>

        <SiteNav />
      </div>
    </header>
  );
}
