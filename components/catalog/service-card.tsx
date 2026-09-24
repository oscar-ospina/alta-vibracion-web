import Link from "next/link";
import { Check, Gift, Sparkles, Video } from "lucide-react";
import { Badge, Card, CardContent } from "@saas/ui";
import { AgendaCta } from "@/components/brand/agenda-cta";
import { GiftCta } from "@/components/brand/gift-cta";
import { InterestCta } from "@/components/catalog/interest-cta";
import { type Service, formatCOP, isSellable, servicePath } from "@/lib/catalog";

/**
 * One catalog card, driven by the service's status (plan sections 3 and 8).
 * Active: price, what it includes, "Elegir horario" into the agenda and
 * "Regalar esta cita" when the service allows it. In preparation: the
 * "En preparación" tag, the descriptor and the interest CTA. Never a price,
 * a calendar or a strikethrough on a future service. Server component.
 */
export function ServiceCard({ service, withLink = true }: { service: Service; withLink?: boolean }) {
  const sellable = isSellable(service);
  const heading = withLink ? (
    <Link
      href={servicePath(service)}
      className="rounded-md hover:text-brand-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {service.name}
    </Link>
  ) : (
    service.name
  );

  return (
    <Card className="flex w-full flex-col" data-testid={`service-${service.id}`}>
      <CardContent className="flex flex-1 flex-col gap-3">
        {sellable ? (
          <Badge className="self-start border-transparent bg-violet-100 text-violet-700">
            <Video className="size-3.5" aria-hidden />
            Virtual · {service.durationMinutes} min
          </Badge>
        ) : (
          <Badge className="self-start border-transparent bg-orange-50 text-brand-ink">
            <Sparkles className="size-3.5" aria-hidden />
            En preparación
          </Badge>
        )}

        <div>
          <h3 className="text-lg font-semibold leading-tight text-foreground">{heading}</h3>
          {sellable && (
            <p className="mt-1 text-xs font-semibold text-violet-700">{service.tag}</p>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>

        {sellable && (
          <ul className="space-y-1.5 text-sm text-foreground">
            {service.includes.map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-col gap-3 border-t border-neutral-100 pt-3">
          {sellable ? (
            <>
              <span className="font-semibold text-foreground">{formatCOP(service.price)}</span>
              {service.status === "active" ? (
                <AgendaCta
                  source="consultation"
                  size="sm"
                  className="w-full"
                  consultationId={service.id}
                  eventProps={{ service: service.id }}
                  aria-label={`${service.cta} para ${service.name}`}
                >
                  {service.cta}
                </AgendaCta>
              ) : (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-brand-ink">
                  Reservas en pausa por ahora. Escríbenos si quieres una fecha.
                </p>
              )}
              {service.allowsGift && (
                <GiftCta source="card" size="sm" className="w-full" aria-label={`Regalar esta cita: ${service.name}`}>
                  <Gift className="size-4" aria-hidden />
                  Regalar esta cita
                </GiftCta>
              )}
            </>
          ) : (
            <InterestCta service={service} className="w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
