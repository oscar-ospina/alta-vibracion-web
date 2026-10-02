import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MessageCircle } from "lucide-react";
import { Button, Card, CardContent } from "@saas/ui";
import { hasDatabase } from "@/db/client";
import { LocalInstant } from "@/components/agenda/local-instant";
import { InterestForm } from "@/components/catalog/interest-form";
import { FIRST_SESSION, NUMEROLOGY_DISCLAIMER, formatCOP } from "@/lib/catalog";
import { CAMPAIGN_CODE_RE, quote } from "@/lib/campaigns";
import { ROUTES, whatsappUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Encuentro 729",
  robots: { index: false, follow: false },
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">Encuentro 729</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      {children}
    </div>
  );
}

function GeneralAlternative() {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Button asChild size="lg">
        <Link href={ROUTES.agenda}>
          <Calendar className="size-5" aria-hidden />
          Consultar disponibilidad general
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a href={whatsappUrl("Hola, vengo de un encuentro y quiero consultar la disponibilidad.")} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="size-5" aria-hidden />
          Escribir por WhatsApp
        </a>
      </Button>
    </div>
  );
}

/**
 * /encuentros/<code> (plan sections 5 and 8): the campaign link behind the
 * QR. Before activation it registers interest, free and without any
 * promise that the offer is on. Once Liliana activates it, it shows the
 * price, the exact deadline in Colombia and local time, the conditions and
 * the way into the agenda. Expired, sold out, closed and unknown codes get
 * a clear message and the general alternative; nobody is charged the
 * general price by surprise.
 */
export default async function CampaignPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = codigo.toUpperCase();
  const result = hasDatabase() && CAMPAIGN_CODE_RE.test(code)
    ? await quote(code, null).catch((err) => {
        console.error("campaign: lookup failed", err);
        return { state: "not_found" as const };
      })
    : { state: "not_found" as const };

  if (result.state === "not_found") {
    return (
      <Shell title="Este enlace no corresponde a un encuentro activo">
        <p className="mt-4 text-muted-foreground" data-testid="campaign-state">
          Revisa el código o pídelo de nuevo a quien te lo compartió. Mientras tanto puedes
          consultar la disponibilidad general.
        </p>
        <GeneralAlternative />
      </Shell>
    );
  }

  const { campaign } = result;

  if (result.state === "interest") {
    return (
      <Shell title={campaign.name}>
        <p className="mt-4 text-lg text-muted-foreground" data-testid="campaign-state">
          La sesión individual de {FIRST_SESSION.durationMinutes} minutos tiene un valor de{" "}
          {formatCOP(FIRST_SESSION.price)}. Para este encuentro, si se animan al menos{" "}
          {campaign.threshold} personas, Liliana puede abrir {campaign.capacity} cupos a{" "}
          {formatCOP(campaign.priceCop)} cada uno. Las citas son individuales.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Este registro es gratuito y no reserva ni promete la oferta. Cuando Liliana
          confirme el grupo te compartirá las condiciones y el acceso para reservar.
        </p>
        <Card className="mt-8">
          <CardContent>
            <InterestForm
              service={{ ...FIRST_SESSION, cta: "Quiero participar" }}
              variant="campaign"
              campaignCode={campaign.code}
            />
          </CardContent>
        </Card>
        <p className="mt-6 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
      </Shell>
    );
  }

  if (result.state === "active") {
    return (
      <Shell title={`Ya se completó el grupo: ${campaign.name}`}>
        <p className="mt-4 text-lg text-muted-foreground" data-testid="campaign-state">
          Tu primera sesión de {FIRST_SESSION.durationMinutes} minutos queda en{" "}
          <strong className="text-foreground">{formatCOP(campaign.priceCop)}</strong> si te
          registraste en este encuentro.
        </p>
        <dl className="mt-6 space-y-2 rounded-xl bg-orange-50 p-4 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="font-semibold text-foreground">Puedes reservar hasta</dt>
            <dd data-testid="campaign-closes">
              {campaign.closesAt ? <LocalInstant at={campaign.closesAt.toISOString()} /> : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="font-semibold text-foreground">Cupos con esta tarifa</dt>
            <dd>{campaign.capacity}, sujetos a disponibilidad real en la agenda</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="font-semibold text-foreground">Regalar con esta tarifa</dt>
            <dd>{campaign.allowsGift ? "Permitido para esta campaña" : "No aplica; el regalo va a precio general"}</dd>
          </div>
        </dl>
        {campaign.conditions && (
          <>
            <h2 className="mt-8 text-xl font-bold text-foreground">Condiciones</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground" data-testid="campaign-conditions">
              {campaign.conditions}
            </p>
          </>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          En la agenda usa el mismo WhatsApp o correo con el que te registraste: es lo que
          valida la tarifa. La cita queda confirmada cuando Liliana verifique el pago.
        </p>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href={`${ROUTES.agenda}?campana=${campaign.code}`}>
              <Calendar className="size-5" aria-hidden />
              Reservar con esta tarifa
            </Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{NUMEROLOGY_DISCLAIMER}</p>
      </Shell>
    );
  }

  const title =
    result.state === "expired"
      ? "El plazo de esta oferta terminó"
      : result.state === "sold_out"
        ? "Los cupos de esta oferta se agotaron"
        : "Esta oferta ya está cerrada";
  return (
    <Shell title={title}>
      <p className="mt-4 text-muted-foreground" data-testid="campaign-state">
        {campaign.name}. La tarifa del encuentro ya no está disponible; el precio general de la
        primera sesión es {formatCOP(FIRST_SESSION.price)}. Si crees que hay un error,
        escríbenos.
      </p>
      <GeneralAlternative />
    </Shell>
  );
}
