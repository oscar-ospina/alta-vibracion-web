import { ServiceCard } from "@/components/catalog/service-card";
import { FIRST_SESSION, NUMEROLOGY_DISCLAIMER } from "@/lib/catalog";

/**
 * The one product of October on the home (plan section 8, "/": promesa
 * general, CTA primera sesión). A single card for Mi Mapa 729 with its
 * price, what it includes, the booking CTA and the gift CTA. Server component.
 */
export function FirstSession() {
  return (
    <section id="sesiones" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Empieza por tu mapa</h2>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            Una sesión individual, virtual, de {FIRST_SESSION.durationMinutes} minutos con
            Liliana Tobón. Escuchas la historia de los números del 1 al 9, recorres tu
            mapa y te llevas un resumen escrito para volver a leer.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
        </div>
        <ServiceCard service={FIRST_SESSION} />
      </div>
    </section>
  );
}
