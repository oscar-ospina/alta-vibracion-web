import Link from "next/link";
import { Check, Gift, Sparkles, Video } from "lucide-react";
import { Badge, Card, CardContent } from "@saas/ui";
import { AgendaCta } from "@/components/brand/agenda-cta";
import { GiftCta } from "@/components/brand/gift-cta";
import { InterestCta } from "@/components/catalog/interest-cta";
import { type Service, formatCOP, isSellable, servicePath } from "@/lib/catalog";

/**
 * CTA geometry of the design's Size=Large button (agenda 745:13936, 49px tall,
 * padding 12/16), for a DS Button with `size="lg"`: the DS gives the 16px sides,
 * and a 25px line (Figma's Body/B0 box) instead of the DS 28px gives
 * 12 + 25 + 12 = 49. Long labels wrap, centered, instead of overflowing a narrow
 * column or a phone; a wrapped label is 74px tall. Shared with the detail page
 * (components/catalog/service-page.tsx) so both render the same buttons.
 */
export const CTA_LG = "whitespace-normal text-center leading-[25px]";
/** CTA_LG stretched to the width of its card. */
export const CTA = `w-full ${CTA_LG}`;
/** The outline variant draws a 1px border, so it takes 11px of padding to land on the same 49px. */
export const CTA_OUTLINE = `${CTA} py-[11px]`;

/**
 * The status tag of a service, shared by the card and the detail page so one
 * status always looks the same. Agenda chips, radius 8, 14px SemiBold: a service
 * on sale shows "Virtual · N min" in orange-100/orange-900 (8.59:1), one in
 * preparation shows "En preparación" white with the Surfaces ink hairline at 16%
 * and #565973 text (6.84:1). The two states stay apart without the violet the
 * design never uses on a surface.
 */
export function ServiceStatusBadge({ service }: { service: Service }) {
  return isSellable(service) ? (
    <Badge className="self-start rounded-lg border-transparent bg-orange-100 px-2.5 py-1 text-sm font-semibold text-orange-900 [&>svg]:size-4">
      <Video aria-hidden />
      Virtual · {service.durationMinutes} min
    </Badge>
  ) : (
    <Badge className="self-start rounded-lg border-surface-ink/16 bg-card px-2.5 py-1 text-sm font-semibold text-muted-foreground [&>svg]:size-4">
      <Sparkles aria-hidden />
      En preparación
    </Badge>
  );
}

/**
 * One catalog card, driven by the service's status (plan sections 3 and 8).
 * Active: price, what it includes, "Elegir horario" into the agenda and
 * "Regalar esta cita" when the service allows it. In preparation: the
 * "En preparación" tag, the descriptor and the interest CTA. Never a price,
 * a calendar or a strikethrough on a future service. Server component.
 *
 * Plan V2.1 card with no Figma twin, dressed like the agenda's Summary card
 * (776:12026): white, radius 16, padding 24, 20px between blocks, no border or
 * shadow (the DS Card's are overridden). Name in Title Small (Archivo Medium 24),
 * copy in Body/B1 #363744, price in Title/Titel Medium (Archivo SemiBold 28),
 * 49px CTAs and the ServiceStatusBadge tag. The theme tag is brand-ink (#c5460d,
 * AA at 14px) rather than Figma's Orange/500, which only passes as large text.
 * Also rendered by the home (FirstSession) and the line pages
 * (components/catalog/line-page.tsx).
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
    <Card className="flex w-full flex-col border-0 shadow-none" data-testid={`service-${service.id}`}>
      <CardContent className="flex flex-1 flex-col gap-5">
        <ServiceStatusBadge service={service} />

        <div>
          <h3 className="text-title-title-small tracking-normal text-foreground">{heading}</h3>
          {sellable && <p className="mt-2 text-body-b2-semibold text-brand-ink">{service.tag}</p>}
        </div>

        <p className="text-body-b1-regular text-foreground">{service.description}</p>

        {sellable && (
          <ul className="space-y-2 text-body-b1-regular text-foreground">
            {service.includes.map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-brand-ink" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-col gap-3">
          {sellable ? (
            <>
              <span className="font-display text-title-titel-medium text-foreground">
                {formatCOP(service.price)}
              </span>
              {service.status === "active" ? (
                <AgendaCta
                  source="consultation"
                  size="lg"
                  className={CTA}
                  consultationId={service.id}
                  eventProps={{ service: service.id }}
                  aria-label={`${service.cta} para ${service.name}`}
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
                  source="card"
                  size="lg"
                  className={CTA_OUTLINE}
                  aria-label={`Regalar esta cita: ${service.name}`}
                >
                  <Gift className="size-4" aria-hidden />
                  Regalar esta cita
                </GiftCta>
              )}
            </>
          ) : (
            <InterestCta service={service} size="lg" className={CTA} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
