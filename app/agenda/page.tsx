import { Suspense } from "react";
import type { Metadata } from "next";
import { AgendaFlow, AgendaSkeleton } from "@/components/agenda/agenda-flow";

export const metadata: Metadata = {
  title: "Agenda tu cita",
  description:
    "Elige tu consulta de numerología con Liliana Tobón, la fecha y la hora. Te confirmamos por WhatsApp.",
};

/**
 * /agenda — the in-app booking flow (story oscar-ospina/saas-planner#45, local
 * MVP: simulated availability + WhatsApp handoff; no backend). The interactive
 * flow is a client island behind Suspense (it reads ?cita= via useSearchParams);
 * the heading prerenders so the page has server-rendered content.
 */
export default function AgendaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground">
        Agenda tu sesión con Liliana Tobón
      </h1>
      <p className="mt-2 text-muted-foreground">
        Elige modalidad, fecha y hora para tu consulta. Te confirmamos por
        WhatsApp.
      </p>
      <Suspense fallback={<AgendaSkeleton />}>
        <AgendaFlow />
      </Suspense>
    </div>
  );
}
