import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Card, CardContent, Label, cn } from "@saas/ui";
import { hasDatabase } from "@/db/client";
import { deliveryStage, getBookingWithReport, reportTemplate } from "@/lib/agenda/delivery";
import { ADMIN_NOTICE, REPORT_STATUS_LABEL, STAGE_LABEL, STATUS_LABEL, type AdminNoticeKey } from "@/lib/agenda/labels";
import { BOGOTA, formatInZone } from "@/lib/agenda/time";
import { findConsultation, formatCOP } from "@/lib/consultations";
import { setAttended, setFollowUpDone, setIntakeReceived, submitReport } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserva",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-semibold text-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

/**
 * One booking: the delivery marks (form received, session attended, day-14
 * follow-up) and the report editor with its draft/reviewed/approved state.
 */
export default async function AdminBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  if (!hasDatabase() || !UUID_RE.test(id)) notFound();
  const row = await getBookingWithReport(id).catch((err) => {
    console.error("admin: booking lookup failed", err);
    return null;
  });
  if (!row) notFound();
  const { booking: b, report } = row;
  const now = new Date();
  const stage = deliveryStage(b, report, now);
  const stageLabel = stage === "attended" || stage === "delivered" ? STAGE_LABEL[stage].label : STATUS_LABEL[stage].label;
  const notice = aviso && aviso in ADMIN_NOTICE ? ADMIN_NOTICE[aviso as AdminNoticeKey] : null;
  const confirmed = b.status === "confirmed";
  const service = findConsultation(b.serviceId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
      <p className="text-sm">
        <Link href="/admin" className="text-brand-ink underline underline-offset-2">← Agenda</Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold text-foreground">
        Reserva <span className="font-mono">{b.code}</span>
      </h1>
      {notice && (
        <p role="alert" data-testid="admin-notice" className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-ink">
          {notice}
        </p>
      )}

      <Card className="mt-6">
        <CardContent>
          <dl className="space-y-1 text-sm">
            <Row label="Sesión">{service?.name ?? b.serviceId} · {formatCOP(b.priceCop)}</Row>
            <Row label="Hora de Colombia">{formatInZone(b.startsAt, BOGOTA)}</Row>
            {b.clientTimeZone !== BOGOTA && (
              <Row label="Hora del cliente">{formatInZone(b.startsAt, b.clientTimeZone)} ({b.clientTimeZone})</Row>
            )}
            <Row label="Cliente">{b.customerName}</Row>
            <Row label="Contacto">{b.contactValue} ({b.contactChannel})</Row>
            {b.origin && <Row label="Origen">{b.origin}</Row>}
            <Row label="Etapa"><span data-testid="booking-stage" className="font-semibold">{stageLabel}</span></Row>
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            Página del cliente:{" "}
            <Link href={`/agenda/${b.code}`} className="text-brand-ink underline underline-offset-2">/agenda/{b.code}</Link>
          </p>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-xl font-bold text-foreground">Entrega</h2>
      {!confirmed ? (
        <p className="mt-2 text-sm text-muted-foreground">Las marcas de entrega se activan cuando la reserva está confirmada.</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm" data-testid="delivery-marks">
          <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <span>
              Formulario previo:{" "}
              <strong data-testid="mark-intake">{b.intakeReceivedAt ? `recibido el ${formatInZone(b.intakeReceivedAt, BOGOTA)}` : "pendiente"}</strong>
            </span>
            <form action={setIntakeReceived}>
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="received" value={b.intakeReceivedAt ? "0" : "1"} />
              <Button size="sm" variant={b.intakeReceivedAt ? "outline" : "default"} type="submit">
                {b.intakeReceivedAt ? "Desmarcar" : "Marcar recibido"}
              </Button>
            </form>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <span>
              Sesión:{" "}
              <strong data-testid="mark-attended">{b.attendedAt ? `realizada el ${formatInZone(b.attendedAt, BOGOTA)}` : "pendiente"}</strong>
            </span>
            {!b.attendedAt && (
              <form action={setAttended}>
                <input type="hidden" name="id" value={b.id} />
                <Button size="sm" type="submit">Marcar sesión realizada</Button>
              </form>
            )}
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <span>
              Seguimiento del día 14:{" "}
              <strong data-testid="mark-follow-up">{b.followUpDoneAt ? `hecho el ${formatInZone(b.followUpDoneAt, BOGOTA)}` : "pendiente"}</strong>
            </span>
            {b.attendedAt && !b.followUpDoneAt && (
              <form action={setFollowUpDone}>
                <input type="hidden" name="id" value={b.id} />
                <Button size="sm" variant="outline" type="submit">Marcar seguimiento hecho</Button>
              </form>
            )}
          </li>
        </ul>
      )}

      <h2 className="mt-10 text-xl font-bold text-foreground">Resumen de la sesión</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estado actual:{" "}
        <strong data-testid="report-status">{report ? REPORT_STATUS_LABEL[report.status] : "Sin informe"}</strong>.
        El cliente solo lo ve cuando está aprobado. Aprobar exige la sesión marcada como realizada. Revisa la lista de
        control del <Link href="/admin/script" className="text-brand-ink underline underline-offset-2">guion</Link> antes de aprobar.
      </p>
      <Card className="mt-3">
        <CardContent>
          <form action={submitReport} className="space-y-4">
            <input type="hidden" name="id" value={b.id} />
            <div>
              <Label htmlFor="report-body">Texto (Markdown)</Label>
              <textarea
                id="report-body"
                name="body"
                rows={22}
                maxLength={20_000}
                defaultValue={report?.body ?? reportTemplate(b)}
                className={cn("mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm", FOCUS_RING)}
              />
            </div>
            <fieldset className="flex flex-wrap gap-4 text-sm">
              <legend className="font-semibold text-foreground">Guardar como</legend>
              {(["draft", "reviewed", "approved"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <input type="radio" name="status" value={s} defaultChecked={(report?.status ?? "draft") === s} />
                  {REPORT_STATUS_LABEL[s]}
                </label>
              ))}
            </fieldset>
            <Button type="submit">Guardar resumen</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
