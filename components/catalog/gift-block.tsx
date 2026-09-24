import { Gift } from "lucide-react";
import { Card, CardContent } from "@saas/ui";
import { GiftCta } from "@/components/brand/gift-cta";
import { FIRST_SESSION, formatCOP } from "@/lib/catalog";

/**
 * "Regala Mi Mapa 729" block (plan section 7.1). Shown on /celebremos before
 * the future proposals and on the Mi Mapa 729 page. The gift is the same
 * first session for another adult, same price; "Detalles con Sentido" is a
 * future catalog and must not be confused with this. Server component.
 */
export function GiftBlock({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-0 bg-neutral-950 p-0 text-white" data-testid="gift-block">
      <CardContent className={compact ? "p-6" : "grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10"}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-orange-300">
            Regala Mi Mapa 729
          </p>
          <h2 className={compact ? "mt-2 text-xl font-bold" : "mt-2 text-2xl font-bold sm:text-3xl"}>
            Hay regalos que invitan a descubrirse
          </h2>
          <p className="mt-3 max-w-2xl text-white/85">
            La primera sesión individual de {FIRST_SESSION.durationMinutes} minutos para otra
            persona adulta, con su propio resumen privado. {formatCOP(FIRST_SESSION.price)}.
            Antes del pago confirmamos disponibilidad, forma de entrega y condiciones.
          </p>
        </div>
        <GiftCta source="gift_block" variant="default" size="lg" className="justify-self-start md:justify-self-end">
          <Gift className="size-5" aria-hidden />
          Regalar una cita
        </GiftCta>
      </CardContent>
    </Card>
  );
}
