import { Check, Gift, MessageCircle, Video } from "lucide-react";
import { Badge, Card, CardContent } from "@saas/ui";
import {
  CONSULTATIONS,
  NUMEROLOGY_DISCLAIMER,
  formatCOP,
} from "@/lib/consultations";
import { AgendaCta } from "@/components/brand/agenda-cta";
import { BookingButton } from "@/components/brand/booking-button";

/**
 * Catalog grid on the home. Data-driven from CONSULTATIONS. Bookable services
 * open /agenda with the service preselected; the gift goes to WhatsApp because
 * the recipient books later and gift conditions are still being defined.
 * Server component.
 */
export function Consultations() {
  return (
    <section
      id="sesiones"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10"
    >
      <h2 className="text-3xl font-bold text-foreground">
        Sesiones de numerología
      </h2>
      <p className="mt-2 text-muted-foreground">
        Virtuales, por Google Meet, en hora de Colombia. Elige la que resuena
        contigo.
      </p>

      <ul className="mt-8 grid gap-5 md:grid-cols-3">
        {CONSULTATIONS.map((c) => (
          <li key={c.id} className="flex">
            <Card className="flex w-full flex-col">
              <CardContent className="flex flex-1 flex-col gap-3">
                <Badge className="self-start border-transparent bg-violet-100 text-violet-700">
                  {c.bookable ? (
                    <Video className="size-3.5" aria-hidden />
                  ) : (
                    <Gift className="size-3.5" aria-hidden />
                  )}
                  Virtual · {c.durationMinutes} min
                </Badge>

                <div>
                  <h3 className="text-lg font-semibold leading-tight text-foreground">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-violet-700">
                    {c.tag}
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {c.description}
                </p>

                <ul className="space-y-1.5 text-sm text-foreground">
                  {c.includes.map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-brand-ink"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {c.requiresPreviousSession && (
                  <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-brand-ink">
                    Solo para quienes ya tuvieron su primera sesión.
                  </p>
                )}

                <div className="mt-auto flex flex-col gap-3 border-t border-neutral-100 pt-3">
                  <span className="font-semibold text-foreground">
                    {formatCOP(c.price)}
                  </span>
                  {c.bookable ? (
                    <AgendaCta
                      source="consultation"
                      size="sm"
                      className="w-full"
                      consultationId={c.id}
                      eventProps={{ service: c.id }}
                      aria-label={`Consultar horarios para ${c.name}`}
                    >
                      Consultar horarios
                    </AgendaCta>
                  ) : (
                    <BookingButton
                      source="gift"
                      size="sm"
                      className="w-full"
                      message={`Hola, quiero regalar «${c.name}». ¿Me cuentas cómo funciona?`}
                      eventProps={{ service: c.id }}
                      aria-label={`Preguntar por ${c.name} en WhatsApp`}
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Preguntar por WhatsApp
                    </BookingButton>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
    </section>
  );
}
