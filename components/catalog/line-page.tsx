import type { ReactNode } from "react";
import { ServiceCard } from "@/components/catalog/service-card";
import { EXPECTATION_NOTE, type Line, NUMEROLOGY_DISCLAIMER, servicesOf } from "@/lib/catalog";

/**
 * One template for the four line pages (plan section 9: "una sola plantilla
 * por tipo de página"). Header copy from the plan, then the line's cards in
 * order. `before` renders between the header and the cards; /celebremos uses
 * it for the gift block, which the plan wants ahead of the future proposals.
 */
export function LinePage({ line, before }: { line: Line; before?: ReactNode }) {
  const services = servicesOf(line.id);
  const hasFuture = services.some((s) => s.status === "expectation");
  const hasPrice = services.some((s) => s.status === "active" || s.status === "paused");
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{line.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{line.intro}</p>

      {before && <div className="mt-8">{before}</div>}

      <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid={`line-${line.id}`}>
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
