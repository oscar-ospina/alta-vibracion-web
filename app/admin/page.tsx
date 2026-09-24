import type { Metadata } from "next";
import Link from "next/link";
import { gte } from "drizzle-orm";
import { Button, Card, CardContent, Input, Label, cn } from "@saas/ui";
import { getDb, hasDatabase, schema } from "@/db/client";
import { listUpcomingBookings } from "@/lib/agenda/bookings";
import {
  FOLLOW_UP_DAYS,
  deliveryStage,
  listFollowUpsDue,
  listPendingDeliveries,
  listPendingIntake,
  reportsByBookingId,
  type BookingWithReport,
} from "@/lib/agenda/delivery";
import { BOGOTA, formatInZone, formatLongDate, todayInBogota } from "@/lib/agenda/time";
import { bookingServiceLabel, formatCOP } from "@/lib/catalog";
import { displayContact } from "@/lib/contact";
import { REPORT_STATUS_LABEL, STAGE_LABEL, STATUS_LABEL, adminNotice } from "@/lib/agenda/labels";
import { addOverride, cancelBooking, confirmBooking, createManualBookingAction, deleteOverride } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración de agenda",
  robots: { index: false, follow: false },
};

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

const LINK = "text-brand-ink underline underline-offset-2";

function stageLabel(stage: ReturnType<typeof deliveryStage>): string {
  return stage === "attended" || stage === "delivered" ? STAGE_LABEL[stage].label : STATUS_LABEL[stage].label;
}

/** One row of the pending lists: when, code, name, link to the booking page. */
function PendingList({ rows, testId, empty }: { rows: { id: string; code: string; startsAt: Date; customerName: string; extra?: string }[]; testId: string; empty: string }) {
  if (rows.length === 0) return <p className="mt-2 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="mt-2 space-y-1 text-sm" data-testid={testId}>
      {rows.map((r) => (
        <li key={r.id} data-code={r.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2">
          <span className="whitespace-nowrap">{formatInZone(r.startsAt, BOGOTA)}</span>
          <Link href={`/admin/bookings/${r.id}`} className={cn("font-mono", LINK)}>{r.code}</Link>
          <span>{r.customerName}</span>
          {r.extra && <span className="text-muted-foreground">{r.extra}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Private admin: upcoming bookings with confirm/cancel, the three pending
 * lists from the plan (forms, deliveries, day-14 follow-ups) and per-date
 * availability exceptions. Page loads are challenged by proxy.ts; each action
 * re-checks credentials itself.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const notice = adminNotice(aviso);
  if (!hasDatabase()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p>Sin base de datos configurada (DATABASE_URL).</p>
      </div>
    );
  }
  const now = new Date();
  let bookings: Awaited<ReturnType<typeof listUpcomingBookings>> = [];
  let overrides: (typeof schema.availabilityOverrides.$inferSelect)[] = [];
  let reports = new Map<string, typeof schema.reports.$inferSelect>();
  let pendingIntake: Awaited<ReturnType<typeof listPendingIntake>> = [];
  let pendingDeliveries: BookingWithReport[] = [];
  let followUps: Awaited<ReturnType<typeof listFollowUpsDue>> = [];
  try {
    [bookings, overrides, reports, pendingIntake, pendingDeliveries, followUps] = await Promise.all([
      listUpcomingBookings(now),
      getDb()
        .select()
        .from(schema.availabilityOverrides)
        .where(gte(schema.availabilityOverrides.date, todayInBogota(now)))
        .orderBy(schema.availabilityOverrides.date),
      reportsByBookingId(),
      listPendingIntake(),
      listPendingDeliveries(),
      listFollowUpsDue(now),
    ]);
  } catch (err) {
    console.error("admin: database unavailable", err);
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p>No se pudo consultar la base de datos. Revisa DATABASE_URL y las migraciones.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
      <p className="mt-2 text-muted-foreground">
        Confirma una reserva solo después de verificar el pago en la cuenta. Las horas
        se muestran en hora de Colombia.{" "}
        <Link href="/admin/script" className={LINK}>Guion y plan de siete días</Link>
        {" · "}
        <Link href="/admin/interests" className={LINK}>Intereses y regalos por consultar</Link>
        {" · "}
        <Link href="/admin/campaigns" className={LINK}>Campañas de encuentro</Link>
        {" · "}
        <Link href="/admin/gifts" className={LINK}>Regalos</Link>.
      </p>

      {notice && (
        <p role="alert" data-testid="admin-notice" className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-ink">
          {notice}
        </p>
      )}

      <h2 className="mt-8 text-xl font-bold text-foreground">Próximas reservas</h2>
      {bookings.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No hay reservas próximas.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm" data-testid="bookings-table">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Cuándo</th>
                <th className="py-2 pr-3">Código</th>
                <th className="py-2 pr-3">Sesión</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Contacto</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const stage = deliveryStage(b, reports.get(b.id) ?? null, now);
                const status = stage === "attended" || stage === "delivered" ? "confirmed" : stage;
                return (
                  <tr key={b.id} className="border-b align-top" data-code={b.code}>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatInZone(b.startsAt, BOGOTA)}</td>
                    <td className="py-2 pr-3 font-mono">
                      <Link href={`/admin/bookings/${b.id}`} className={LINK}>{b.code}</Link>
                    </td>
                    <td className="py-2 pr-3">
                      {bookingServiceLabel(b)}
                      <span className="block text-xs text-muted-foreground">
                        {b.giftOrderId ? "Regalo canjeado" : formatCOP(b.priceCop)}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {b.customerName}
                      {b.clientTimeZone !== BOGOTA && (
                        <span className="block text-xs text-muted-foreground">{b.clientTimeZone}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {displayContact(b.contactChannel, b.contactValue)}
                      <span className="block text-xs text-muted-foreground">{b.contactChannel}</span>
                    </td>
                    <td className="py-2 pr-3 font-semibold" data-testid="admin-status">
                      {stageLabel(stage)}
                    </td>
                    <td className="py-2">
                      {status === "pending_payment" && (
                        <div className="flex gap-2">
                          <form action={confirmBooking}>
                            <input type="hidden" name="id" value={b.id} />
                            <Button size="sm" type="submit">Confirmar pago</Button>
                          </form>
                          <form action={cancelBooking}>
                            <input type="hidden" name="id" value={b.id} />
                            <Button size="sm" variant="outline" type="submit">Cancelar</Button>
                          </form>
                        </div>
                      )}
                      {status === "confirmed" && !b.attendedAt && (
                        <form action={cancelBooking}>
                          <input type="hidden" name="id" value={b.id} />
                          <Button size="sm" variant="outline" type="submit">Cancelar</Button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 text-xl font-bold text-foreground">Formularios pendientes</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sesiones confirmadas cuyo formulario previo aún no llega. Márcalo en la reserva cuando lo recibas.
      </p>
      <PendingList rows={pendingIntake} testId="pending-intake" empty="Ningún formulario pendiente." />

      <h2 className="mt-10 text-xl font-bold text-foreground">Entregas pendientes</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sesiones realizadas sin resumen aprobado. El cliente solo ve el resumen cuando está aprobado.
      </p>
      <PendingList
        rows={pendingDeliveries.map(({ booking, report }) => ({
          ...booking,
          extra: report ? `Informe: ${REPORT_STATUS_LABEL[report.status]}` : "Sin informe",
        }))}
        testId="pending-deliveries"
        empty="Ninguna entrega pendiente."
      />

      <h2 className="mt-10 text-xl font-bold text-foreground">Seguimiento del día {FOLLOW_UP_DAYS}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sesiones realizadas hace {FOLLOW_UP_DAYS} días o más sin seguimiento. Desaparecen al marcarlo, así nadie recibe dos mensajes.
      </p>
      <PendingList rows={followUps} testId="follow-ups" empty="Ningún seguimiento pendiente." />

      <h2 className="mt-10 text-xl font-bold text-foreground">Reserva manual</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Para un pago que llegó después de vencer el plazo, un regalo que se agenda o alguien que
        escribió por WhatsApp. Cualquier hora en hora de Colombia; si choca con otra reserva, no se
        crea. Marca «pago verificado» solo si ya viste el ingreso en la cuenta.
      </p>
      <Card className="mt-3">
        <CardContent>
          <form action={createManualBookingAction} className="grid gap-4 md:grid-cols-3" data-testid="manual-booking-form">
            <div>
              <Label htmlFor="mb-name">Nombre</Label>
              <Input id="mb-name" name="customerName" maxLength={80} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="mb-channel">Canal</Label>
              <select
                id="mb-channel"
                name="contactChannel"
                className={cn("mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm", FOCUS_RING)}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Correo</option>
              </select>
            </div>
            <div>
              <Label htmlFor="mb-contact">Contacto</Label>
              <Input id="mb-contact" name="contactValue" maxLength={120} required className="mt-2" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <Label htmlFor="mb-date">Fecha</Label>
              <Input id="mb-date" name="date" type="date" required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="mb-time">Hora (Colombia)</Label>
              <Input id="mb-time" name="time" type="time" required defaultValue="18:00" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="mb-price">Precio (COP, 0 si es un regalo ya pagado)</Label>
              <Input id="mb-price" name="priceCop" type="number" min={0} defaultValue={149900} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="mb-note">Nota de origen (opcional, sin espacios)</Label>
              <Input id="mb-note" name="note" maxLength={40} className="mt-2" placeholder="whatsapp" />
            </div>
            <div>
              <Label htmlFor="mb-gift">Código de bono de regalo (opcional)</Label>
              <Input id="mb-gift" name="giftCode" maxLength={12} className="mt-2" placeholder="RG-XXXXXXXX" />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name="paid" className={cn("accent-orange-700", FOCUS_RING)} />
              Pago verificado: crear confirmada
            </label>
            <div className="self-end">
              <Button type="submit">Crear reserva</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-xl font-bold text-foreground">Excepciones de disponibilidad</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        La regla base es lunes a jueves a las 18:00. Aquí cierras un día completo, cierras
        una hora concreta o abres una hora extra (por ejemplo una mañana para España).
      </p>
      <Card className="mt-3">
        <CardContent>
          <form action={addOverride} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_2fr_auto] md:items-end">
            <div>
              <Label htmlFor="ov-date">Fecha</Label>
              <Input id="ov-date" name="date" type="date" required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="ov-kind">Tipo</Label>
              <select
                id="ov-kind"
                name="kind"
                className={cn("mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm", FOCUS_RING)}
              >
                <option value="closed">Cerrar</option>
                <option value="extra">Hora extra</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ov-time">Hora (vacío = todo el día)</Label>
              <Input id="ov-time" name="time" type="time" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="ov-note">Nota</Label>
              <Input id="ov-note" name="note" maxLength={200} className="mt-2" />
            </div>
            <Button type="submit">Guardar</Button>
          </form>
        </CardContent>
      </Card>
      {overrides.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" data-testid="overrides-list">
          {overrides.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
              <span>
                {formatLongDate(o.date)} · {o.kind === "closed" ? "Cerrado" : "Extra"}
                {o.time ? ` ${o.time}` : " (todo el día)"}
                {o.note && <span className="text-muted-foreground"> · {o.note}</span>}
              </span>
              <form action={deleteOverride}>
                <input type="hidden" name="id" value={o.id} />
                <Button size="sm" variant="outline" type="submit">Quitar</Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
