import Link from "next/link";
import { Button } from "@saas/ui";
import { Logo } from "@/components/brand/logo";
import { whatsappUrl } from "@/lib/site";

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
          className="inline-flex shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo variant="mark" href={null} className="h-8 w-auto md:hidden" />
          <Logo variant="horizontal" href={null} className="hidden h-9 w-auto md:block" />
        </Link>

        <Button size="sm" asChild>
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
            Agenda tu cita
          </a>
        </Button>
      </div>
    </header>
  );
}
