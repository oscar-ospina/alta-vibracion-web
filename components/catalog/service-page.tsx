import Link from "next/link";
import { Check, Gift } from "lucide-react";
import { Card, CardContent } from "@saas/ui";
import { AgendaCta } from "@/components/brand/agenda-cta";
import { GiftCta } from "@/components/brand/gift-cta";
import { GiftBlock } from "@/components/catalog/gift-block";
import { InterestCta } from "@/components/catalog/interest-cta";
import { CTA, CTA_LG, CTA_OUTLINE, ServiceStatusBadge } from "@/components/catalog/service-card";
import {
  EXPECTATION_NOTE,
  NUMEROLOGY_DISCLAIMER,
  type Service,
  findLine,
  formatCOP,
  isSellable,
} from "@/lib/catalog";

/**
 * Detail page for one service. Two shapes (plan section 8):
 * - active: scope, price, duration, what the client receives, booking CTA and
 *   the gift block when the service allows it;
 * - in preparation: the expectation template (descriptor, "En preparación",
 *   interest CTA) with no price, no calendar, no payment.
 *
 * It speaks the card's language so the page never contradicts the card that
 * links to it: the same ServiceStatusBadge, the buy card white with no border or
 * shadow (radius 16, padding 24, 20px between blocks), the price in Title/Titel
 * Medium, the 49px Size=Large CTAs and the same paused note. The page sits in
 * the shared `container-page`, so its edges line up with the top bar and footer.
 */
export function ServicePage({ service, extra }: { service: Service; extra?: React.ReactNode }) {
  const line = findLine(service.line)!;
  const sellable = isSellable(service);
  return (
    <div className="container-page py-12">
      <p className="text-sm">
        <Link href={line.path} className="text-brand-ink underline underline-offset-2">
          ← {line.title}
        </Link>
      </p>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <ServiceStatusBadge service={service} />
          <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">{service.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{service.description}</p>

          {sellable ? (
            <>
              <h2 className="mt-8 text-xl font-bold text-foreground">Qué incluye</h2>
              <ul className="mt-3 space-y-2 text-foreground">
                {service.includes.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-1 size-4 shrink-0 text-brand-ink" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <h2 className="mt-8 text-xl font-bold text-foreground">Qué no incluye</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Seguimiento ilimitado, una segunda carta completa, grabación de la sesión
                ni pronósticos garantizados. La sesión no es terapia.
              </p>
              <p className="mt-6 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
            </>
          ) : (
            <>
              {extra}
              <p className="mt-8 max-w-2xl text-muted-foreground">
                Si quieres, te avisamos cuando esta propuesta esté lista. {EXPECTATION_NOTE}
              </p>
              <div className="mt-6">
                <InterestCta service={service} size="lg" className={CTA_LG} />
              </div>
            </>
          )}
        </div>

        {sellable && (
          <Card className="border-0 shadow-none lg:sticky lg:top-24" data-testid="service-buy-card">
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Precio
                </p>
                <p className="font-display text-title-titel-medium text-foreground">
                  {formatCOP(service.price)}
                </p>
                <p className="mt-2 text-body-b2-regular text-muted-foreground">
                  Sesión individual de {service.durationMinutes} minutos por Google Meet.
                  Pago por transferencia, confirmado a mano.
                </p>
              </div>
              {service.status === "active" ? (
                <AgendaCta
                  source="consultation"
                  size="lg"
                  className={CTA}
                  consultationId={service.id}
                  eventProps={{ service: service.id }}
                >
                  {service.cta}
                </AgendaCta>
              ) : (
                <p className="rounded-lg bg-orange-100 px-3 py-2 text-body-b2-regular text-orange-900">
                  Reservas en pausa por ahora. Escríbenos si quieres una fecha.
                </p>
              )}
              {service.allowsGift && (
                <GiftCta
                  source="service_page"
                  size="lg"
                  className={CTA_OUTLINE}
                  aria-label={`Regalar esta cita: ${service.name}`}
                >
                  <Gift className="size-4" aria-hidden />
                  Regalar esta cita
                </GiftCta>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {sellable && service.allowsGift && (
        <div className="mt-12">
          <GiftBlock />
        </div>
      )}
    </div>
  );
}
