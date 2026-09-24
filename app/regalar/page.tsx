import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Lock, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@saas/ui";
import { BookingButton } from "@/components/brand/booking-button";
import { FIRST_SESSION, NUMEROLOGY_DISCLAIMER, formatCOP, servicePath } from "@/lib/catalog";
import { GIFT_MESSAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Regala Mi Mapa 729",
  description:
    "Regala a tu pareja, a un hijo adulto o a alguien especial un espacio para conocerse desde la numerología y explorar su propia historia.",
};

const STEPS = [
  { title: "Tú eliges regalar", text: "Nos cuentas que quieres regalar la primera sesión y por qué canal contactarte." },
  { title: "La persona acepta y agenda", text: "Quien recibe el regalo decide participar, entrega sus propios datos y elige su horario." },
  { title: "Vive su propia experiencia", text: "Sesión individual por Meet y un resumen privado que pertenece a quien toma la sesión." },
];

/**
 * /regalar (plan section 7.1): the gift of the first session for another
 * adult. Same scope, 75 minutes, private summary, general price. The
 * assisted inquiry (P0) starts here; until its form ships, the CTA opens
 * WhatsApp with the gift named. No payment before Liliana confirms
 * availability, delivery and conditions. Server component.
 */
export default function GiftPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">Regala Mi Mapa 729</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            Hay regalos que invitan a descubrirse
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Regala a tu pareja, a un hijo adulto o a alguien especial un espacio para
            conocerse desde la numerología y explorar su propia historia.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-3" data-testid="gift-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-neutral-100 bg-card p-5">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {i + 1}
                </span>
                <h2 className="mt-3 font-semibold text-foreground">{s.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>

          <h2 className="mt-10 text-xl font-bold text-foreground">Qué recibe</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            La primera sesión individual, virtual por Google Meet, de{" "}
            {FIRST_SESSION.durationMinutes} minutos, y un resumen personalizado en dos
            días hábiles tras la cita. Es la misma{" "}
            <Link href={servicePath(FIRST_SESSION)} className="font-medium text-brand-ink underline underline-offset-2">
              {FIRST_SESSION.name}
            </Link>{" "}
            que ofrecemos a cualquier adulto.
          </p>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-orange-50 p-5 text-sm text-brand-ink">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              El informe pertenece a quien toma la sesión. Quien regala no recibe el
              resumen ni los datos personales de la otra persona.
            </p>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
        </div>

        <Card className="lg:sticky lg:top-24" data-testid="gift-inquiry">
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio</p>
              <p className="font-display text-3xl font-semibold text-foreground">
                {formatCOP(FIRST_SESSION.price)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Antes del pago confirmaremos disponibilidad, forma de entrega y condiciones
              del regalo.
            </p>
            <BookingButton source="gift" size="lg" className="w-full" message={GIFT_MESSAGE}>
              <Gift className="size-5" aria-hidden />
              Quiero regalar esta experiencia
            </BookingButton>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <MessageCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Por ahora la consulta se atiende por WhatsApp. No pedimos datos de la
              otra persona en este paso.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
