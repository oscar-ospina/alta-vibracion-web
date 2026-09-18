import { Suspense } from "react";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { Button } from "@saas/ui";
import { hasDatabase } from "@/db/client";
import { loadAvailability } from "@/lib/agenda/availability";
import { holdHours } from "@/lib/agenda/bookings";
import { whatsappUrl } from "@/lib/site";
import { AgendaFlow, AgendaSkeleton } from "@/components/agenda/agenda-flow";

export const metadata: Metadata = {
  title: "Agenda tu sesión",
  description:
    "Elige tu sesión de numerología con Liliana Tobón, la fecha y la hora. Te confirmamos por WhatsApp una vez verificado el pago.",
};

// Availability is read from the database on every request.
export const dynamic = "force-dynamic";

/**
 * /agenda. With DATABASE_URL: real availability from Postgres and a booking
 * form (client island). Without it: the manual path from the plan, a WhatsApp
 * button that asks for available times. Never simulated slots.
 */
export default async function AgendaPage() {
  let online = hasDatabase();
  let slots: Awaited<ReturnType<typeof loadAvailability>> = [];
  if (online) {
    try {
      slots = await loadAvailability();
    } catch (err) {
      // Unreachable or unmigrated database: degrade to the manual path.
      console.error("agenda: availability unavailable", err);
      online = false;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground">
        Agenda tu sesión con Liliana Tobón
      </h1>
      <p className="mt-2 text-muted-foreground">
        {online
          ? "Elige tu sesión, la fecha y la hora. Tu cita queda confirmada cuando Liliana verifique el pago."
          : "Escríbenos por WhatsApp y te compartimos los horarios disponibles."}
      </p>

      {online ? (
        <Suspense fallback={<AgendaSkeleton />}>
          <AgendaFlow slots={slots} holdHours={holdHours()} />
        </Suspense>
      ) : (
        <div className="mt-8" data-testid="agenda-fallback">
          <Button asChild size="lg">
            <a
              href={whatsappUrl(
                "Hola, quiero consultar los horarios disponibles para una sesión de numerología.",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-5" aria-hidden />
              Consultar horarios por WhatsApp
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
