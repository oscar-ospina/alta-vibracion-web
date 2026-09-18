import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button, Card, CardContent } from "@saas/ui";
import { hasDatabase } from "@/db/client";
import { findBookingByCode } from "@/lib/agenda/bookings";
import { deliveryStage, findApprovedReport } from "@/lib/agenda/delivery";
import { BOGOTA, formatInZone } from "@/lib/agenda/time";
import { STAGE_LABEL, STATUS_LABEL } from "@/lib/agenda/labels";
import { findConsultation, formatCOP } from "@/lib/consultations";
import { whatsappUrl } from "@/lib/site";
import { Prose } from "@/components/sections/prose";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estado de tu reserva",
  robots: { index: false, follow: false },
};

/** Public status page. The code is the only key; it carries no personal data. */
export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!hasDatabase()) notFound();
  const { code } = await params;
  const booking = await findBookingByCode(code).catch((err) => {
    console.error("agenda: status lookup failed", err);
    return null;
  });
  if (!booking) notFound();

  // Only an approved report leaves the admin; drafts never reach this page.
  const report = booking.attendedAt ? await findApprovedReport(booking.id) : null;
  const stage = deliveryStage(booking, report);
  const service = findConsultation(booking.serviceId);
  const info = stage === "attended" || stage === "delivered" ? STAGE_LABEL[stage] : STATUS_LABEL[stage];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground">Tu reserva</h1>
      <Card className="mt-6">
        <CardContent className="space-y-4">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Código</dt>
              <dd className="font-mono font-bold">{booking.code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Sesión</dt>
              <dd className="text-right">{service?.name ?? booking.serviceId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Hora de Colombia</dt>
              <dd className="text-right">{formatInZone(booking.startsAt, BOGOTA)}</dd>
            </div>
            {booking.clientTimeZone !== BOGOTA && (
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-foreground">Tu hora</dt>
                <dd className="text-right">
                  {formatInZone(booking.startsAt, booking.clientTimeZone)} ({booking.clientTimeZone})
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Valor</dt>
              <dd>{formatCOP(booking.priceCop)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Estado</dt>
              <dd data-testid="booking-status" className="font-semibold">
                {info.label}
              </dd>
            </div>
          </dl>
          <p className="text-muted-foreground">{info.hint}</p>
          <Button asChild>
            <a
              href={whatsappUrl(`Hola, te escribo por mi reserva ${booking.code}.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-4" aria-hidden />
              Escribir por WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
      {report && (
        <Card className="mt-6">
          <CardContent>
            <div data-testid="booking-report">
              <Prose>{report.body}</Prose>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
