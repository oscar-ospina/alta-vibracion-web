import type { Metadata } from "next";
import Link from "next/link";
import { gte } from "drizzle-orm";
import { Button, Card, CardContent, Input, Label, cn } from "@saas/ui";
import { getDb, hasDatabase, schema } from "@/db/client";
import { blocksSlot, bookableWindow, loadAvailability } from "@/lib/agenda/availability";
import { listUpcomingBookings } from "@/lib/agenda/bookings";
import { adminNotice } from "@/lib/agenda/labels";
import {
  DEFAULT_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  WEEKDAY_LABEL,
  WEEKDAY_ORDER,
  describeRules,
  extraDuration,
  groupClosures,
} from "@/lib/agenda/schedule";
import { BOGOTA, bogotaDateOf, formatInZone, formatLongDate, todayInBogota } from "@/lib/agenda/time";
import {
  addOverride,
  addRule,
  closeRange,
  deleteOverride,
  deleteRule,
  reopenRange,
  setRuleActive,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Horarios",
  robots: { index: false, follow: false },
};

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";
const SELECT = cn("mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm", FOCUS_RING);
const LINK = "text-brand-ink underline underline-offset-2";

const weekdayRank = (d: number) => WEEKDAY_ORDER.indexOf(d as (typeof WEEKDAY_ORDER)[number]);

function rangeLabel(from: string, to: string, days: number): string {
  if (from === to) return formatLongDate(from);
  return `${formatLongDate(from)} al ${formatLongDate(to)} (${days} días)`;
}

/**
 * Private schedule screen: the weekly base rules, vacation ranges and
 * single-date exceptions, plus a preview of what /agenda offers right now.
 * Every action re-checks credentials (schedule/actions.ts).
 */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const notice = adminNotice(aviso);
  if (!hasDatabase()) {
    return <p className="mx-auto max-w-4xl px-4 py-10">Sin base de datos configurada (DATABASE_URL).</p>;
  }
  const now = new Date();
  const today = todayInBogota(now);
  let rules: (typeof schema.availabilityRules.$inferSelect)[] = [];
  let overrides: (typeof schema.availabilityOverrides.$inferSelect)[] = [];
  let bookings: Awaited<ReturnType<typeof listUpcomingBookings>> = [];
  let slots: Awaited<ReturnType<typeof loadAvailability>> = [];
  try {
    const db = getDb();
    [rules, overrides, bookings, slots] = await Promise.all([
      db.select().from(schema.availabilityRules),
      db
        .select()
        .from(schema.availabilityOverrides)
        .where(gte(schema.availabilityOverrides.date, today))
        .orderBy(schema.availabilityOverrides.date),
      listUpcomingBookings(now),
      loadAvailability(now),
    ]);
  } catch (err) {
    console.error("admin schedule: database unavailable", err);
    return (
      <p className="mx-auto max-w-4xl px-4 py-10">
        No se pudo consultar la base de datos. Revisa DATABASE_URL y las migraciones.
      </p>
    );
  }

  const sortedRules = [...rules].sort(
    (a, b) => weekdayRank(a.weekday) - weekdayRank(b.weekday) || (a.time < b.time ? -1 : 1),
  );
  const closures = groupClosures(overrides);
  const singles = overrides.filter((o) => !(o.kind === "closed" && o.time === null));
  // Bookings that still hold a slot. Closing a day never cancels them.
  const live = bookings.filter((b) => b.startsAt.getTime() > now.getTime() && blocksSlot(b, now));
  const liveIn = (from: string, to: string) =>
    live.filter((b) => {
      const d = bogotaDateOf(b.startsAt);
      return d >= from && d <= to;
    });
  const offered = bookableWindow(today);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground">Horarios</h1>
      <p className="mt-2 text-muted-foreground">
        Horas en hora de Colombia. Hoy la agenda ofrece {describeRules(rules)}. Los cambios se ven de
        inmediato en la <Link href="/agenda" className={LINK}>agenda pública</Link> y nunca cancelan una
        reserva ya hecha.
      </p>

      {notice && (
        <p role="alert" data-testid="admin-notice" className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-ink">
          {notice}
        </p>
      )}

      <h2 className="mt-8 text-xl font-bold text-foreground">Horario semanal</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Se repite cada semana. Desactiva un horario para pausarlo sin perderlo; bórralo si ya no lo vas a usar.
        Para cambiar una hora, agrega la nueva y desactiva la anterior.
      </p>
      {sortedRules.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No hay horarios. La agenda no ofrece nada hasta que agregues uno.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm" data-testid="rules-list">
          {sortedRules.map((r) => (
            <li
              key={r.id}
              data-rule={`${r.weekday}-${r.time}`}
              className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2", !r.active && "opacity-60")}
            >
              <span>
                <strong>{WEEKDAY_LABEL[r.weekday]}</strong> · {r.time} · {r.durationMinutes} min
                <span className="ml-2 text-muted-foreground" data-testid="rule-state">
                  {r.active ? "Activo" : "Desactivado"}
                </span>
              </span>
              <span className="flex gap-2">
                <form action={setRuleActive}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                  <Button size="sm" variant="outline" type="submit">{r.active ? "Desactivar" : "Activar"}</Button>
                </form>
                <form action={deleteRule}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button size="sm" variant="outline" type="submit">Borrar</Button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Card className="mt-3">
        <CardContent>
          <form action={addRule} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <div>
              <Label htmlFor="rule-weekday">Día</Label>
              <select id="rule-weekday" name="weekday" className={SELECT} defaultValue="1">
                {WEEKDAY_ORDER.map((d) => (
                  <option key={d} value={d}>{WEEKDAY_LABEL[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rule-time">Hora de inicio</Label>
              <Input id="rule-time" name="time" type="time" required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="rule-duration">Duración protegida (min)</Label>
              <Input
                id="rule-duration"
                name="duration"
                type="number"
                min={MIN_DURATION_MINUTES}
                max={MAX_DURATION_MINUTES}
                step={5}
                defaultValue={rules.length ? extraDuration(rules) : DEFAULT_DURATION_MINUTES}
                required
                className="mt-2"
              />
            </div>
            <Button type="submit">Agregar horario</Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-xl font-bold text-foreground">Vacaciones y días cerrados</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cierra uno o varios días seguidos (hasta 120). Para un solo día, usa la misma fecha en los dos campos.
      </p>
      <Card className="mt-3">
        <CardContent>
          <form action={closeRange} className="grid gap-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
            <div>
              <Label htmlFor="vac-from">Desde</Label>
              <Input id="vac-from" name="from" type="date" min={today} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="vac-to">Hasta (incluido)</Label>
              <Input id="vac-to" name="to" type="date" min={today} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="vac-note">Motivo (solo lo ves tú)</Label>
              <Input id="vac-note" name="note" maxLength={200} placeholder="Vacaciones" className="mt-2" />
            </div>
            <Button type="submit">Bloquear días</Button>
          </form>
        </CardContent>
      </Card>
      {closures.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" data-testid="closures-list">
          {closures.map((c) => {
            const affected = liveIn(c.from, c.to);
            return (
              <li key={c.ids[0]} className="rounded-lg border px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <strong>{rangeLabel(c.from, c.to, c.days)}</strong>
                    {c.note && <span className="text-muted-foreground"> · {c.note}</span>}
                  </span>
                  <form action={reopenRange}>
                    <input type="hidden" name="ids" value={c.ids.join(",")} />
                    <Button size="sm" variant="outline" type="submit">Reabrir</Button>
                  </form>
                </div>
                {affected.length > 0 && (
                  <p className="mt-2 text-brand-ink" data-testid="closure-bookings">
                    Ojo: {affected.length === 1 ? "hay una reserva activa" : `hay ${affected.length} reservas activas`} en
                    estas fechas. Escríbele al cliente para moverla o cancélala desde la reserva:{" "}
                    {affected.map((b, i) => (
                      <span key={b.id}>
                        {i > 0 && ", "}
                        <Link href={`/admin/bookings/${b.id}`} className={cn("font-mono", LINK)}>{b.code}</Link>
                      </span>
                    ))}
                    .
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-10 text-xl font-bold text-foreground">Excepciones de un día</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cierra una hora concreta o abre una hora extra (por ejemplo una mañana para un cliente en España).
        Con la hora vacía, «Cerrar» cierra el día completo.
      </p>
      <Card className="mt-3">
        <CardContent>
          <form action={addOverride} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_2fr_auto] md:items-end">
            <div>
              <Label htmlFor="ov-date">Fecha</Label>
              <Input id="ov-date" name="date" type="date" min={today} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="ov-kind">Tipo</Label>
              <select id="ov-kind" name="kind" className={SELECT}>
                <option value="closed">Cerrar</option>
                <option value="extra">Hora extra</option>
              </select>
            </div>
            <div>
              <Label htmlFor="ov-time">Hora</Label>
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
      {singles.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" data-testid="overrides-list">
          {singles.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
              <span>
                {formatLongDate(o.date)} · {o.kind === "closed" ? "Cerrado" : "Extra"} {o.time}
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

      <h2 className="mt-10 text-xl font-bold text-foreground">Lo que ve el público</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Horarios libres entre el {formatLongDate(offered.from)} y el {formatLongDate(offered.to)}, ya
        descontando cierres y reservas: {slots.length}.
      </p>
      {slots.length > 0 && (
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2" data-testid="public-slots">
          {slots.slice(0, 12).map((s) => (
            <li key={s.startsAt}>{formatInZone(new Date(s.startsAt), BOGOTA)}</li>
          ))}
        </ul>
      )}
      {slots.length > 12 && <p className="mt-1 text-sm text-muted-foreground">y {slots.length - 12} más.</p>}
    </div>
  );
}
