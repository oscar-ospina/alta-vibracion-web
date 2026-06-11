"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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
  CONSULTATIONS,
  type Consultation,
  formatCOP,
} from "@/lib/consultations";
import { whatsappUrl } from "@/lib/site";
import {
  type ISODate,
  type Modality,
  type MonthCursor,
  type SlotTime,
  SLOT_TIMES,
  buildBookingMessage,
  firstBookableDate,
  formatLongDate,
  formatSlotLabel,
  isBookableDate,
  lastBookableDate,
  monthCursorFor,
  sameMonth,
  shiftMonth,
  todayInBogota,
} from "@/lib/agenda";
import {
  type AgendaState,
  type BookedSlot,
  addBooking,
  ensureBlockedSlots,
  findBooking,
  loadAgendaState,
} from "@/lib/agenda-store";
import { MonthCalendar } from "@/components/agenda/month-calendar";

/**
 * The local-MVP Agenda flow (story oscar-ospina/saas-planner#45): consultation →
 * modality → date → time → name → WhatsApp handoff. No backend — availability is
 * simulated per viewed date (1–3 slots "Reservado", persisted in localStorage),
 * the visitor's own booking persists too ("Tu cita"), and confirming opens
 * WhatsApp with the full details; Liliana syncs her real calendar manually.
 *
 * Everything that depends on the clock or localStorage is gated on hydration
 * (`useIsHydrated` → skeleton first), so the server HTML and the first client
 * paint match (no hydration mismatch) regardless of when the page was built.
 */

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Session-only summary for the confirmation panel — never persisted (PII). */
type ConfirmedBooking = {
  consultationName: string;
  modality: Modality;
  date: ISODate;
  time: SlotTime;
  name: string;
};

// Hydration gate without setState-in-effect: the server snapshot is false, the
// client snapshot true — React re-renders once right after hydration.
const subscribeNoop = () => () => {};
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

const MODALITIES: { value: Modality; label: string }[] = [
  { value: "presencial", label: "Presencial" },
  { value: "virtual", label: "Virtual" },
];

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
      <Card className="mt-5">
        <CardContent className="flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded bg-neutral-100" />
          <div className="h-10 w-56 animate-pulse rounded bg-neutral-100" />
        </CardContent>
      </Card>
    </div>
  );
}

export function AgendaFlow() {
  const searchParams = useSearchParams();
  const consultationParam = searchParams.get("consultation");
  const hydrated = useIsHydrated();

  // Bogotá "today" is clock-dependent → only computed client-side, post-gate.
  const today = useMemo<ISODate | null>(
    () => (hydrated ? todayInBogota() : null),
    [hydrated],
  );

  // Preselect from /agenda?consultation=<id> (the grid's CTAs).
  const [consultation, setConsultation] = useState<Consultation>(
    () =>
      CONSULTATIONS.find((c) => String(c.id) === consultationParam) ??
      CONSULTATIONS[0],
  );
  const [modality, setModality] = useState<Modality>("presencial");
  // null = "no user override yet" → derived defaults below.
  const [cursorOverride, setCursorOverride] = useState<MonthCursor | null>(
    null,
  );
  const [agendaOverride, setAgendaOverride] = useState<AgendaState | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(null);
  const [selectedTime, setSelectedTime] = useState<SlotTime | null>(null);
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  // The early return guarantees `hydrated` below it — `today` is derived from it.
  if (!today) return <AgendaSkeleton />;

  const cursor = cursorOverride ?? monthCursorFor(firstBookableDate(today));
  // loadAgendaState() reads localStorage once and returns the stable module
  // cache afterwards, so deriving it during render is cheap and loop-safe.
  const agenda = agendaOverride ?? loadAgendaState();

  const minCursor = monthCursorFor(firstBookableDate(today));
  const maxCursor = monthCursorFor(lastBookableDate(today));
  const blockedForDate = selectedDate ? (agenda.blocked[selectedDate] ?? []) : [];

  const trimmedName = name.trim();
  const ready =
    selectedDate !== null && selectedTime !== null && trimmedName.length >= 2;

  const confirmHref = ready
    ? whatsappUrl(
        buildBookingMessage({
          name: trimmedName,
          consultationName: consultation.name,
          modality,
          date: selectedDate,
          time: selectedTime,
        }),
      )
    : undefined;

  function handleSelectDate(date: ISODate) {
    // First view of a date rolls its 1–3 simulated-busy slots and persists them.
    ensureBlockedSlots(date);
    setAgendaOverride(loadAgendaState());
    setSelectedDate(date);
    setSelectedTime(null);
  }

  function handleConfirm() {
    if (!ready || !selectedDate || !selectedTime) return;
    const slot: BookedSlot = {
      date: selectedDate,
      time: selectedTime,
      createdAt: new Date().toISOString(),
    };
    setAgendaOverride(addBooking(slot));
    setConfirmed({
      consultationName: consultation.name,
      modality,
      date: selectedDate,
      time: selectedTime,
      name: trimmedName,
    });
    track("book_consultation", {
      source: "agenda",
      consultation: consultation.name,
      modality,
    });
  }

  if (confirmed) {
    const reopenHref = whatsappUrl(
      buildBookingMessage({
        name: confirmed.name,
        consultationName: confirmed.consultationName,
        modality: confirmed.modality,
        date: confirmed.date,
        time: confirmed.time,
      }),
    );
    return (
      <Card className="mt-8 max-w-2xl">
        <CardContent className="space-y-4">
          {/* Deliberately NOT a success state: the request only exists once the
              visitor presses send inside WhatsApp — which we can't observe. The
              panel frames the send as the pending last step (review finding). */}
          <div className="flex items-center gap-3">
            <MessageCircle className="size-8 text-brand-ink" aria-hidden />
            <h2 className="text-xl font-bold text-foreground">
              Último paso: envía el mensaje en WhatsApp
            </h2>
          </div>
          <p className="text-muted-foreground">
            Abrimos WhatsApp en otra pestaña con los detalles de tu solicitud
            — solo falta que <strong>envíes el mensaje</strong>. Lili revisará
            su disponibilidad y te confirmará por ese mismo chat. El pago
            también se coordina por WhatsApp.
          </p>
          <dl className="space-y-1 rounded-xl bg-orange-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Consulta</dt>
              <dd className="text-right">{confirmed.consultationName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Modalidad</dt>
              <dd className="capitalize">{confirmed.modality}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Fecha</dt>
              <dd className="text-right">{formatLongDate(confirmed.date)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-foreground">Hora</dt>
              <dd>{formatSlotLabel(confirmed.time)} (hora de Colombia)</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={reopenHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" aria-hidden />
                Abrir WhatsApp de nuevo
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmed(null);
                setSelectedTime(null);
              }}
            >
              Agendar otra consulta
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Para cambios o cancelaciones, escríbenos por el mismo chat.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-8">
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)_240px]">
        {/* Rail: consultant + consultation + modality (design kit's left column). */}
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
                Consulta
              </Label>
              <Select
                value={String(consultation.id)}
                onValueChange={(v) => {
                  const found = CONSULTATIONS.find((c) => String(c.id) === v);
                  if (found) setConsultation(found);
                }}
              >
                <SelectTrigger
                  aria-labelledby="consultation-label"
                  className="mt-2 w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTATIONS.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {consultation.description}
              </p>
            </div>

            {/* Kit parity note: the kit draws 22px orange circle-dot icons over
                a bare label (no input). We keep native radios for a11y and
                approximate the look — stacked options, larger brand-accent
                control, 16px labels (accepted deviation, like brand-ink). */}
            <fieldset>
              <legend className="text-sm font-bold text-foreground">
                Modalidad de la sesión
              </legend>
              <div className="mt-2 flex flex-col gap-2">
                {MODALITIES.map((m) => (
                  <label
                    key={m.value}
                    className="flex cursor-pointer items-center gap-2.5 text-base text-foreground"
                  >
                    <input
                      type="radio"
                      name="modality"
                      value={m.value}
                      checked={modality === m.value}
                      onChange={() => setModality(m.value)}
                      className={cn("size-5 accent-orange-700", FOCUS_RING)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent>
            <h2 className="mb-4 text-sm font-bold text-foreground">
              Selecciona la fecha
            </h2>
            <MonthCalendar
              cursor={cursor}
              selected={selectedDate}
              isBookable={(date) => isBookableDate(date, today)}
              onSelect={handleSelectDate}
              canPrev={!sameMonth(cursor, minCursor)}
              canNext={!sameMonth(cursor, maxCursor)}
              onPrev={() => setCursorOverride(shiftMonth(cursor, -1))}
              onNext={() => setCursorOverride(shiftMonth(cursor, 1))}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Atención de lunes a viernes. Horarios en hora de Colombia
              (GMT-5).
            </p>
          </CardContent>
        </Card>

        {/* Time slots */}
        <Card>
          <CardContent>
            <h2 className="mb-1 text-sm font-bold text-foreground">
              Selecciona la hora
            </h2>
            <p className="mb-3 min-h-4 text-xs text-muted-foreground">
              {selectedDate
                ? formatLongDate(selectedDate)
                : "Elige primero una fecha."}
            </p>
            <div className="flex flex-col gap-2">
              {SLOT_TIMES.map((t) => {
                const yours =
                  selectedDate !== null &&
                  findBooking(agenda, selectedDate, t) !== undefined;
                const blocked = !yours && blockedForDate.includes(t);
                const isSelected = selectedTime === t;
                const base = cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                  FOCUS_RING,
                );
                if (yours) {
                  return (
                    <div
                      key={t}
                      className={cn(
                        base,
                        "border-violet-200 bg-violet-100 text-violet-700",
                      )}
                    >
                      {formatSlotLabel(t)}
                      <span className="text-xs font-bold">Tu cita</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!selectedDate || blocked}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTime(t)}
                    className={cn(
                      base,
                      isSelected
                        ? "border-brand-ink bg-brand-ink text-white"
                        : blocked
                          ? "border-neutral-100 bg-neutral-100 text-neutral-500"
                          : selectedDate
                            ? "border-neutral-200 bg-card text-foreground hover:border-orange-300 hover:bg-orange-50"
                            : "border-neutral-100 text-neutral-300",
                    )}
                  >
                    {formatSlotLabel(t)}
                    {blocked && <span className="text-xs">Reservado</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary bar: price + name + WhatsApp handoff (kit's footer bar). */}
      <Card className="mt-5">
        <CardContent className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Precio
            </p>
            <p className="font-display text-2xl font-semibold text-foreground">
              {formatCOP(consultation.price)}
            </p>
            <p className="text-xs text-muted-foreground">
              El pago se coordina por WhatsApp.
            </p>
          </div>

          <div className="min-w-56 flex-1">
            <Label htmlFor="booking-name">Tu nombre</Label>
            <Input
              id="booking-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Cómo te llamas?"
              autoComplete="name"
              maxLength={80}
              className="mt-2"
            />
          </div>

          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {selectedDate && selectedTime
                ? `${formatLongDate(selectedDate)} · ${formatSlotLabel(selectedTime)}${
                    ready ? "" : " — cuéntanos tu nombre para continuar"
                  }`
                : "Elige fecha, hora y cuéntanos tu nombre."}
            </p>
            {ready ? (
              <Button asChild size="lg">
                <a
                  href={confirmHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleConfirm}
                >
                  <MessageCircle className="size-5" aria-hidden />
                  Confirmar por WhatsApp
                </a>
              </Button>
            ) : (
              <Button size="lg" disabled>
                <MessageCircle className="size-5" aria-hidden />
                Confirmar por WhatsApp
              </Button>
            )}
          </div>
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
    </div>
  );
}
