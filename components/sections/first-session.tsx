import { ServiceCard } from "@/components/catalog/service-card";
import { FIRST_SESSION, NUMEROLOGY_DISCLAIMER } from "@/lib/catalog";

/**
 * The one product of October on the home (plan section 8, "/": promesa
 * general, CTA primera sesión). A single card for Mi Mapa 729 with its
 * price, what it includes, the booking CTA and the gift CTA. Server component.
 *
 * Plan V2.1 section with no Figma frame (it replaced the design's "Aplicaciones
 * Prácticas" grid), so it borrows that section's language (section4 182:3914):
 * the shared `container-page` (1248px of content at 1440) with 80px of vertical
 * padding from 950px and 40px below, an H2 in Header/H2 SemiBold (45/49.5, kept
 * at every width like the design's titles), 20px from the title to the Body/B0
 * lead in #363744, and 40px between the text and the card (the design's
 * title-to-cards gap). From 950px the card sits beside the text at 404px, the
 * width of the agenda's Summary card (776:12026). From 768px it already sits
 * beside the text at 338px, as the design's tablet frame keeps its text and
 * visual rows side by side (section3 937:19055); 338 is the Universe column at
 * 768 (Figma's tablet section4 card), so the two sections share a right edge.
 * Below 768 it stacks under the text, capped at 404px and aligned left, so the
 * CTAs never stretch into bars. The disclaimer stays small and muted (14px
 * #565973, 6.34:1 on the page).
 */
export function FirstSession() {
  return (
    <section id="sesiones" className="container-page py-10 desktop:py-20">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_338px] md:items-center desktop:grid-cols-[minmax(0,1fr)_404px]">
        <div>
          <h2 className="text-header-h2-semibold text-foreground">Empieza por tu mapa</h2>
          <p className="mt-5 max-w-xl text-body-b0-regular text-foreground">
            Una sesión individual, virtual, de {FIRST_SESSION.durationMinutes} minutos con
            Liliana Tobón. Escuchas la historia de los números del 1 al 9, recorres tu
            mapa y te llevas un resumen escrito para volver a leer.
          </p>
          <p className="mt-5 max-w-xl text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
        </div>
        <div className="flex w-full max-w-[404px]">
          <ServiceCard service={FIRST_SESSION} />
        </div>
      </div>
    </section>
  );
}
