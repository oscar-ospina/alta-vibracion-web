import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@saas/ui";
import { InterestForm } from "@/components/catalog/interest-form";
import { FIRST_SESSION, NUMEROLOGY_DISCLAIMER, formatCOP, servicePath } from "@/lib/catalog";

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
 * assisted inquiry (P0) is the form on the right: buyer's name, one channel,
 * an optional message and the authorization to attend the inquiry. No data
 * about the beneficiary, no payment before Liliana confirms availability,
 * delivery and conditions.
 *
 * Laid out like the catalog: the shared `container-page`, so the edges line up
 * with the top bar and footer, and the cards of ServiceCard (white, radius 16, no
 * border or shadow). The step numbers and the privacy note use the orange-100 /
 * orange-900 pair of the card's tags and notes (8.59:1) instead of violet, which
 * the design never puts on a surface. The steps go three across only when their
 * column is at least 576px wide (a container query), so they never shrink to
 * ~130px columns beside the form between 1024 and 1180px.
 */
export default function GiftPage() {
  return (
    <div className="container-page py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="@container">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">Regala Mi Mapa 729</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
            Hay regalos que invitan a descubrirse
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Regala a tu pareja, a un hijo adulto o a alguien especial un espacio para
            conocerse desde la numerología y explorar su propia historia.
          </p>

          <ol className="mt-8 grid gap-4 @xl:grid-cols-3" data-testid="gift-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-card p-5">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-900">
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

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-orange-100 p-5 text-body-b2-regular text-orange-900">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              El informe pertenece a quien toma la sesión. Quien regala no recibe el
              resumen ni los datos personales de la otra persona.
            </p>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
        </div>

        {/* The form's submit button (components/catalog/interest-form.tsx, frozen by an
            open PR) keeps the DS nowrap: at 350px "Quiero regalar esta experiencia"
            (302px) scrolled the page sideways. Scoped override until that file wraps it. */}
        <Card
          className="border-0 shadow-none lg:sticky lg:top-24 [&_button[type=submit]]:whitespace-normal [&_button[type=submit]]:text-center"
          data-testid="gift-inquiry"
        >
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio</p>
              <p className="font-display text-title-titel-medium text-foreground">
                {formatCOP(FIRST_SESSION.price)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Antes del pago confirmaremos disponibilidad, forma de entrega y condiciones
              del regalo.
            </p>
            <InterestForm service={{ ...FIRST_SESSION, cta: "Quiero regalar esta experiencia" }} variant="gift" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
