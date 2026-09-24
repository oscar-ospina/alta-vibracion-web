import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Gift, Lock, MessageCircle } from "lucide-react";
import { Button, Card, CardContent } from "@saas/ui";
import { hasDatabase } from "@/db/client";
import { FIRST_SESSION, NUMEROLOGY_DISCLAIMER } from "@/lib/catalog";
import { GIFT_CODE_RE, redeemableGift } from "@/lib/gifts";
import { ROUTES, whatsappUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Te regalaron Mi Mapa 729",
  robots: { index: false, follow: false },
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">Regala Mi Mapa 729</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      {children}
    </div>
  );
}

/**
 * /regalar/<code>: the invitation the buyer shares (plan section 7.1, step
 * 5). The beneficiary reads the message, what the session is, and accepts by
 * going into the agenda with the voucher. Nothing about the beneficiary is
 * stored until they book themselves. A used, unpaid or unknown voucher says
 * so; it never opens a paid booking.
 */
export default async function GiftInvitationPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = codigo.toUpperCase();
  const result = hasDatabase() && GIFT_CODE_RE.test(code)
    ? await redeemableGift(code).catch((err) => {
        console.error("gift: lookup failed", err);
        return { state: "not_found" as const };
      })
    : { state: "not_found" as const };

  if (result.state === "not_found") {
    return (
      <Shell title="Este enlace no corresponde a un regalo">
        <p className="mt-4 text-muted-foreground" data-testid="gift-state">
          Revisa el código o pídelo de nuevo a quien te lo compartió.
        </p>
      </Shell>
    );
  }

  const { order } = result;

  if (result.state !== "ready") {
    const title =
      result.state === "redeemed"
        ? "Este regalo ya fue canjeado"
        : result.state === "pending"
          ? "Este regalo aún no está confirmado"
          : "Este regalo ya no está disponible";
    return (
      <Shell title={title}>
        <p className="mt-4 text-muted-foreground" data-testid="gift-state">
          {result.state === "redeemed"
            ? "La cita de este bono ya fue reservada. Si crees que hay un error, escríbenos."
            : result.state === "pending"
              ? "Quien te lo regala todavía está completando el pago. Vuelve a abrir este enlace más tarde o escríbenos."
              : "Este bono fue cancelado. Si crees que hay un error, escríbenos."}
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <a href={whatsappUrl(`Hola, te escribo por el regalo ${order.code}.`)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" aria-hidden />
              Escribir por WhatsApp
            </a>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="Hay regalos que invitan a descubrirse">
      <p className="mt-4 text-lg text-muted-foreground" data-testid="gift-state">
        {order.buyerName} te regala {FIRST_SESSION.name}: una sesión individual de{" "}
        {FIRST_SESSION.durationMinutes} minutos con Liliana Tobón, virtual por Google Meet, con un
        resumen personalizado para conservar. Ya está pagada.
      </p>
      {order.message && (
        <Card className="mt-6">
          <CardContent>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-ink">
              <Gift className="size-4" aria-hidden />
              Mensaje de {order.buyerName}
            </p>
            <p className="mt-2 whitespace-pre-line text-foreground" data-testid="gift-message">{order.message}</p>
          </CardContent>
        </Card>
      )}
      <ul className="mt-6 space-y-2 text-muted-foreground">
        {FIRST_SESSION.includes.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-orange-50 p-5 text-sm text-brand-ink">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Tú decides si participas y eliges tu horario. El resumen de la sesión es tuyo: quien te
          regala no lo recibe ni ve tus datos.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={`${ROUTES.agenda}?bono=${order.code}`}>
            <Calendar className="size-5" aria-hidden />
            Aceptar y elegir mi horario
          </Link>
        </Button>
      </div>
      {order.conditions && (
        <p className="mt-6 whitespace-pre-line text-sm text-muted-foreground" data-testid="gift-conditions">
          {order.conditions}
        </p>
      )}
      <p className="mt-6 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
    </Shell>
  );
}
