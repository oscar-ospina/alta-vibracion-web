import type { Metadata } from "next";
import { gte } from "drizzle-orm";
import { Button, Card, CardContent, Input, Label, cn } from "@saas/ui";
import { getDb, hasDatabase, schema } from "@/db/client";
import { effectiveStatus, listUpcomingBookings } from "@/lib/agenda/bookings";
import { BOGOTA, formatInZone, formatLongDate, todayInBogota } from "@/lib/agenda/time";
import { findConsultation, formatCOP } from "@/lib/consultations";
import { addOverride, cancelBooking, confirmBooking, deleteOverride } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración de agenda",
  robots: { index: false, follow: false },
};

const STATUS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  expired: "Vencida",
};

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Private admin: upcoming bookings with confirm/cancel, and per-date
 * availability exceptions. Page loads are challenged by proxy.ts; each action
 * re-checks credentials itself.
 */
export default async function AdminPage() {
  if (!hasDatabase()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p>Sin base de datos configurada (DATABASE_URL).</p>
      </div>
    );
  }
  const now = new Date();
  const [bookings, overrides] = await Promise.all([
    listUpcomingBookings(now),
    getDb()
      .select()
      .from(schema.availabilityOverrides)
      .where(gte(schema.availabilityOverrides.date, todayInBogota(now)))
      .orderBy(schema.availabilityOverrides.date),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
      <p className="mt-2 text-muted-foreground">
        Confirma una reserva solo después de verificar el pago en la cuenta. Las horas
        se muestran en hora de Colombia.
      </p>

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
                const status = effectiveStatus(b, now);
                return (
                  <tr key={b.id} className="border-b align-top" data-code={b.code}>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatInZone(b.startsAt, BOGOTA)}</td>
                    <td className="py-2 pr-3 font-mono">{b.code}</td>
                    <td className="py-2 pr-3">
                      {findConsultation(b.serviceId)?.name ?? b.serviceId}
                      <span className="block text-xs text-muted-foreground">{formatCOP(b.priceCop)}</span>
                    </td>
                    <td className="py-2 pr-3">
                      {b.customerName}
                      {b.clientTimeZone !== BOGOTA && (
                        <span className="block text-xs text-muted-foreground">{b.clientTimeZone}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {b.contactValue}
                      <span className="block text-xs text-muted-foreground">{b.contactChannel}</span>
                    </td>
                    <td className="py-2 pr-3 font-semibold" data-testid="admin-status">
                      {STATUS[status]}
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
                      {status === "confirmed" && (
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
