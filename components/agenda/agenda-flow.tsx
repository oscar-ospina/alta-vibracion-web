"use client";

import { useActionState, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { BadgeCheck, MapPin, MessageCircle } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@saas/ui";
import {
  BOOKABLE_CONSULTATIONS,
  type Consultation,
  findConsultation,
  formatCOP,
} from "@/lib/consultations";
import { ROUTES, whatsappUrl } from "@/lib/site";
import type { Slot } from "@/lib/agenda/availability";
import {
  BOGOTA,
  type ISODate,
  formatInZone,
  formatLongDate,
  formatTimeInZone,
} from "@/lib/agenda/time";
import {
  type MonthCursor,
  monthCursorFor,
  sameMonth,
  shiftMonth,
} from "@/lib/agenda/calendar";
import { MonthCalendar } from "@/components/agenda/month-calendar";
import { TimeZoneSelect, detectTimeZone } from "@/components/agenda/timezone-select";
import { type BookingFormState, submitBooking } from "@/app/agenda/actions";

/**
 * Booking flow: session → date → time → name + contact + time zone → server
 * action. Slots come from the server (already filtered by holds and
 * confirmations); the action re-checks them and the database's unique index
 * has the final word. On success the panel shows the booking code, the
 * pending-payment status and the WhatsApp handoff.
 */

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

const subscribeNoop = () => () => {};

export function AgendaSkeleton() {
  return (
    <div aria-busy="true" className="mt-8">
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_240px]">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="space-y-4">
              <div className="h-5 w-2/3 animate-pulse rounded bg-neutral-100" />
              <div className="h-32 animate-pulse rounded bg-neutral-100" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-neutral-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function buildHandoffMessage(args: {
  name: string;
  code: string;
  serviceName: string;
  startsAt: Date;
}): string {
  return (
    `Hola, soy ${args.name}. Reservé «${args.serviceName}» para el ` +
    `${formatInZone(args.startsAt, BOGOTA)} (hora de Colombia). ` +
    `Mi código es ${args.code}. ¿Me envías los datos de pago?`
  );
}

export function AgendaFlow({ slots, holdHours }: { slots: Slot[]; holdHours: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultationParam = searchParams.get("consultation");
  const origin = searchParams.get("origen") ?? "";

  const [consultation, setConsultation] = useState<Consultation>(() => {
    const found = findConsultation(consultationParam);
    return found?.bookable ? found : BOOKABLE_CONSULTATIONS[0];
  });
  const [cursorOverride, setCursorOverride] = useState<MonthCursor | null>(null);
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [contact, setContact] = useState("");
  // Server snapshot is Bogotá so server HTML and first client paint agree; the
  // browser's zone takes over right after hydration. The visitor can override.
  const detectedTimeZone = useSyncExternalStore(subscribeNoop, detectTimeZone, () => BOGOTA);
  const [timeZoneOverride, setTimeZoneOverride] = useState<string | null>(null);
  const timeZone = timeZoneOverride ?? detectedTimeZone;

  const [state, formAction, pending] = useActionState<BookingFormState, FormData>(
    submitBooking,
    { status: "idle" },
  );

  const slotsByDate = useMemo(() => {
    const map = new Map<ISODate, Slot[]>();
    for (const s of slots) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return map;
  }, [slots]);
  const dates = useMemo(() => [...slotsByDate.keys()].sort(), [slotsByDate]);

  useEffect(() => {
    if (state.status === "created") {
      track("booking_created", { service: state.serviceId, origin: origin || "direct" });
    }
    // A conflict means our slot list is stale: ask the server for a fresh one.
    if (state.status === "error") router.refresh();
  }, [state, origin, router]);

  if (state.status === "created") {
    const startsAt = new Date(state.startsAt);
    const service = findConsultation(state.serviceId);
    const handoff = whatsappUrl(
      buildHandoffMessage({
        name: state.customerName,
        code: state.code,
        serviceName: service?.name ?? state.serviceId,
        startsAt,
      }),
    );
    return (
      <Card className="mt-8 max-w-2xl" data-testid="booking-created">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Tu horario quedó reservado. Falta el pago.
          </h2>
          <p className="text-muted-foreground">
            Guardamos tu horario por {holdHours} horas mientras Liliana verifica el pago.
            Escríbele por WhatsApp con tu código para recibir los datos de pago.
            La cita queda confirmada cuando ella verifique la transferencia.
          </p>
          <dl className="space-y-1 rounded-xl bg-orange-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Código</dt>
              <dd className="font-mono text-base font-bold" data-testid="booking-code">
                {state.code}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Sesión</dt>
              <dd className="text-right">{service?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Hora de Colombia</dt>
              <dd className="text-right">{formatInZone(startsAt, BOGOTA)}</dd>
            </div>
            {state.clientTimeZone !== BOGOTA && (
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-foreground">Tu hora</dt>
                <dd className="text-right" data-testid="booking-local-time">
                  {formatInZone(startsAt, state.clientTimeZone)} ({state.clientTimeZone})
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Estado</dt>
              <dd>Pendiente de pago</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a
                href={handoff}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("book_consultation", { source: "agenda" })}
              >
                <MessageCircle className="size-5" aria-hidden />
                Enviar mi código por WhatsApp
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`${ROUTES.agenda}/${state.code}`}>Ver estado de mi reserva</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fallbackDate = dates[0] ?? new Date().toISOString().slice(0, 10);
  const cursor = cursorOverride ?? monthCursorFor(fallbackDate);
  const minCursor = monthCursorFor(fallbackDate);
  const maxCursor = monthCursorFor(dates[dates.length - 1] ?? fallbackDate);
  const daySlots = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];
  const ready = selectedSlot !== null && name.trim().length >= 2 && contact.trim().length > 0;

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="serviceId" value={consultation.id} />
      <input type="hidden" name="startsAt" value={selectedSlot?.startsAt ?? ""} />
      <input type="hidden" name="origin" value={origin} />

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)_240px]">
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Image
                src="/lili-home-1.png"
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-full object-cover object-top"
              />
              <div>
                <p className="font-bold text-foreground">Liliana Tobón</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  Numeróloga · Colombia
                </p>
              </div>
            </div>

            <Badge className="self-start border-transparent bg-semantic-green-light text-[#006644]">
              <BadgeCheck className="size-3.5" aria-hidden />
              +50 sesiones
            </Badge>

            <div>
              <Label
                id="consultation-label"
                className="text-xs font-bold uppercase tracking-wider text-violet-700"
              >
                Sesión
              </Label>
              <Select
                value={consultation.id}
                onValueChange={(v) => {
                  const found = findConsultation(v);
                  if (found?.bookable) setConsultation(found);
                }}
              >
                <SelectTrigger aria-labelledby="consultation-label" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKABLE_CONSULTATIONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {consultation.description}
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-foreground">Modalidad</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Virtual, por Google Meet. {consultation.durationMinutes} minutos.
              </p>
              {consultation.requiresPreviousSession && (
                <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-brand-ink">
                  Solo para quienes ya tuvieron su primera sesión.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="mb-4 text-sm font-bold text-foreground">Selecciona la fecha</h2>
            {dates.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="no-slots">
                No hay horarios abiertos en las próximas cuatro semanas. Escríbenos por
                WhatsApp y buscamos una opción.
              </p>
            ) : (
              <MonthCalendar
                cursor={cursor}
                selected={selectedDate}
                isBookable={(date) => slotsByDate.has(date)}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                canPrev={!sameMonth(cursor, minCursor)}
                canNext={!sameMonth(cursor, maxCursor)}
                onPrev={() => setCursorOverride(shiftMonth(cursor, -1))}
                onNext={() => setCursorOverride(shiftMonth(cursor, 1))}
              />
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Horarios en hora de Colombia. Si ninguno te sirve, escríbenos y buscamos
              una opción.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="mb-1 text-sm font-bold text-foreground">Selecciona la hora</h2>
            <p className="mb-3 min-h-4 text-xs text-muted-foreground">
              {selectedDate ? formatLongDate(selectedDate) : "Elige primero una fecha."}
            </p>
            <div className="flex flex-col gap-2" data-testid="slot-list">
              {daySlots.map((s) => {
                const start = new Date(s.startsAt);
                const isSelected = selectedSlot?.startsAt === s.startsAt;
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedSlot(s)}
                    className={cn(
                      "flex w-full flex-col items-start rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                      FOCUS_RING,
                      isSelected
                        ? "border-brand-ink bg-brand-ink text-white"
                        : "border-neutral-200 bg-card text-foreground hover:border-orange-300 hover:bg-orange-50",
                    )}
                  >
                    <span>{formatTimeInZone(start, BOGOTA)} Colombia</span>
                    {timeZone !== BOGOTA && (
                      <span className="text-xs font-normal opacity-80">
                        {formatInZone(start, timeZone)} en tu zona
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardContent className="grid gap-5 md:grid-cols-[auto_1fr_1fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Precio
            </p>
            <p className="font-display text-2xl font-semibold text-foreground">
              {formatCOP(consultation.price)}
            </p>
            <p className="text-xs text-muted-foreground">
              Pago por transferencia. Lili te envía los datos.
            </p>
          </div>

          <div>
            <Label htmlFor="booking-name">Tu nombre</Label>
            <Input
              id="booking-name"
              name="customerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Cómo te llamas?"
              autoComplete="name"
              maxLength={80}
              required
              className="mt-2"
            />
          </div>

          <div>
            <fieldset className="mb-2">
              <legend className="text-sm font-medium text-foreground">
                ¿Cómo te contactamos?
              </legend>
              <div className="mt-1 flex gap-4 text-sm">
                {(["whatsapp", "email"] as const).map((c) => (
                  <label key={c} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="contactChannel"
                      value={c}
                      checked={channel === c}
                      onChange={() => setChannel(c)}
                      className={cn("accent-orange-700", FOCUS_RING)}
                    />
                    {c === "whatsapp" ? "WhatsApp" : "Correo"}
                  </label>
                ))}
              </div>
            </fieldset>
            <Input
              name="contactValue"
              aria-label={channel === "whatsapp" ? "Tu número de WhatsApp" : "Tu correo"}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={channel === "whatsapp" ? "+57 300 000 0000" : "tu@correo.com"}
              type={channel === "email" ? "email" : "tel"}
              autoComplete={channel === "email" ? "email" : "tel"}
              inputMode={channel === "email" ? "email" : "tel"}
              maxLength={120}
              required
            />
          </div>

          <TimeZoneSelect id="booking-tz" value={timeZone} onChange={setTimeZoneOverride} />
        </CardContent>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-5">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selectedSlot ? (
              <>
                {formatInZone(new Date(selectedSlot.startsAt), BOGOTA)} (Colombia)
                {timeZone !== BOGOTA && (
                  <>
                    {" · "}
                    {formatInZone(new Date(selectedSlot.startsAt), timeZone)} ({timeZone})
                  </>
                )}
              </>
            ) : (
              "Elige fecha y hora."
            )}
            {state.status === "error" && (
              <span className="mt-1 block font-semibold text-red-700" role="alert" data-testid="booking-error">
                {state.message}
              </span>
            )}
          </p>
          <Button size="lg" type="submit" disabled={!ready || pending}>
            {pending ? "Reservando…" : "Reservar este horario"}
          </Button>
        </CardContent>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        ¿Prefieres coordinar todo directo por WhatsApp?{" "}
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "rounded-md font-semibold text-brand-ink underline underline-offset-2",
            FOCUS_RING,
          )}
        >
          Escríbenos
        </a>
        .
      </p>
    </form>
  );
}
