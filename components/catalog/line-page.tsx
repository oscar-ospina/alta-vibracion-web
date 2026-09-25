import type { ReactNode } from "react";
import { ServiceCard } from "@/components/catalog/service-card";
import { EXPECTATION_NOTE, type Line, NUMEROLOGY_DISCLAIMER, servicesOf } from "@/lib/catalog";

/**
 * One template for the four line pages (plan section 9: "una sola plantilla
 * por tipo de página"). Header copy from the plan, then the line's cards in
 * order. `before` renders between the header and the cards; /celebremos uses
 * it for the gift block, which the plan wants ahead of the future proposals.
 *
 * The page sits in the shared `container-page`, so its edges line up with the
 * top bar and the footer (96/32/20px gutters). The cards follow the home's
 * Universe grid: 40px below the header, 28px apart, two columns from 640px. Only
 * a line with three services goes to three columns, from 1280px, so /yo reads
 * as one row while two or four cards never leave an empty column or an orphan.
 * Below 1280 /yo's third card sits alone under the first two: three columns at
 * 1024 would be 259px cards, too narrow for their CTAs. At 1440 the three cards
 * are about 397px wide, enough for "Avísame cuando esté disponible" on one line;
 * narrower, the interest CTA wraps (see InterestCta).
 */
export function LinePage({ line, before }: { line: Line; before?: ReactNode }) {
  const services = servicesOf(line.id);
  const hasFuture = services.some((s) => s.status === "expectation");
  const hasPrice = services.some((s) => s.status === "active" || s.status === "paused");
  const threeUp = services.length === 3;
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{line.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{line.intro}</p>

      {before && <div className="mt-10">{before}</div>}

      <ul
        className={threeUp ? "mt-10 grid gap-7 sm:grid-cols-2 xl:grid-cols-3" : "mt-10 grid gap-7 sm:grid-cols-2"}
        data-testid={`line-${line.id}`}
      >
        {services.map((s) => (
          <li key={s.id} className="flex">
            <ServiceCard service={s} withLink={line.hasDetailPages} />
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-1 text-sm text-muted-foreground">
        {hasFuture && <p>{EXPECTATION_NOTE}</p>}
        {hasPrice && <p>{NUMEROLOGY_DISCLAIMER}</p>}
      </div>
    </div>
  );
}
