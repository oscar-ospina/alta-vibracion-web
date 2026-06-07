import { Sparkles } from "lucide-react";
import { Badge, Card, CardContent } from "@saas/ui";
import { CONSULTATIONS, formatCOP } from "@/lib/consultations";
import { BookingButton } from "@/components/brand/booking-button";

/**
 * "Aplicaciones Prácticas" consultations grid (story oscar-ospina/saas-planner#25).
 * Data-driven from CONSULTATIONS; each card's "Agendar" opens WhatsApp with a
 * message naming that consultation (real in-app Agenda is deferred). Server component.
 */
export function Consultations() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
      <h2 className="text-3xl font-bold text-foreground">
        Aplicaciones Prácticas de la Numerología Online
      </h2>
      <p className="mt-2 text-muted-foreground">
        Elige la consulta que resuena contigo. Presencial o virtual.
      </p>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CONSULTATIONS.map((c) => (
          <li key={c.id} className="flex">
            <Card className="flex w-full flex-col">
              <CardContent className="flex flex-1 flex-col gap-3">
                <Badge className="self-start border-transparent bg-violet-100 text-violet-700">
                  <Sparkles className="size-3.5" aria-hidden />
                  {c.modality}
                </Badge>

                <div>
                  <h3 className="text-lg font-semibold leading-tight text-foreground">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-violet-700">
                    {c.tag}
                  </p>
                </div>

                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {c.description}
                </p>

                {/* Stacked footer with a full-width CTA: keeps "Agendar" reachable
                    even where the fixed WhatsApp FAB overlaps a card's bottom-right. */}
                <div className="mt-2 flex flex-col gap-3 border-t border-neutral-100 pt-3">
                  <span className="font-semibold text-foreground">
                    {formatCOP(c.price)}
                  </span>
                  <BookingButton
                    source="consultation"
                    size="sm"
                    className="w-full"
                    message={`Hola Alta Vibración, quiero agendar la consulta "${c.name}".`}
                    eventProps={{ consultation: c.name }}
                    aria-label={`Agendar ${c.name} por WhatsApp`}
                  >
                    Agendar
                  </BookingButton>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
