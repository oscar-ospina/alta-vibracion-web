import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BookingButton } from "@/components/brand/booking-button";

/**
 * Sticky top bar on every route (story oscar-ospina/saas-planner#21): brand logo
 * (→ Home) + a persistent "Agenda tu cita" CTA that opens WhatsApp — the MVP's
 * conversion path (real in-app Agenda is deferred). Server component.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Logo → Home. Compact mark on mobile so the bar never overflows. */}
        <Link
          href="/"
          aria-label="Alta Vibración — Inicio"
          className="inline-flex shrink-0 rounded-md focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo variant="mark" href={null} className="h-8 w-auto md:hidden" />
          <Logo variant="horizontal" href={null} className="hidden h-9 w-auto md:block" />
        </Link>

        <BookingButton source="top_bar" size="sm">
          Agenda tu cita
        </BookingButton>
      </div>
    </header>
  );
}
