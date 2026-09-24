import { Suspense } from "react";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { Button } from "@saas/ui";
import { hasDatabase } from "@/db/client";
import { loadAvailability } from "@/lib/agenda/availability";
import { holdHours } from "@/lib/agenda/bookings";
import { CAMPAIGN_CODE_RE, quote } from "@/lib/campaigns";
import { ACTIVE_SERVICES, FIRST_SESSION, formatCOP } from "@/lib/catalog";
import { GIFT_CODE_RE, redeemableGift } from "@/lib/gifts";
import { paymentInstructions } from "@/lib/payment";
import { whatsappUrl } from "@/lib/site";
import { AgendaFlow, AgendaSkeleton, type CampaignOffer, type GiftVoucher } from "@/components/agenda/agenda-flow";

export const metadata: Metadata = {
  title: "Agenda tu sesión",
  description:
    "Elige tu sesión de numerología con Liliana Tobón, la fecha y la hora. Te confirmamos por WhatsApp una vez verificado el pago.",
};

// Availability is read from the database on every request.
export const dynamic = "force-dynamic";

/**
 * /agenda. With DATABASE_URL: real availability from Postgres and a booking
 * form (client island). Without it: the manual path from the plan, a WhatsApp
 * button that asks for available times. Never simulated slots.
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ campana?: string | string[]; bono?: string | string[] }>;
}) {
  const params = await searchParams;
  const campana = typeof params.campana === "string" ? params.campana : "";
  const bono = typeof params.bono === "string" ? params.bono : "";
  // Liliana pauses the offer by setting the service to `paused`: the agenda
  // then shows the manual path instead of a calendar nobody can buy from.
  let online = hasDatabase() && ACTIVE_SERVICES.length > 0;
  let slots: Awaited<ReturnType<typeof loadAvailability>> = [];
  // A campaign link (plan section 5). Active: the flow shows its price and
  // the server validates the contact. Anything else: say so, then continue
  // at the general price, visibly.
  let offer: CampaignOffer | null = null;
  let campaignNotice: string | null = null;
  // A gift voucher (plan section 7.1): paid → the beneficiary books without
  // paying; anything else is said out loud and the flow stays at the general price.
  let voucher: GiftVoucher | null = null;
  if (online) {
    try {
      slots = await loadAvailability();
    } catch (err) {
      // Unreachable or unmigrated database: degrade to the manual path.
      console.error("agenda: availability unavailable", err);
      online = false;
    }
  }
  // A campaign link (plan section 5), checked on its own so a campaign
  // problem never takes the general agenda down. Active: the flow shows its
  // price and the server validates the contact. Anything else: say so, then
  // continue at the general price, visibly.
  // A gift voucher (plan section 7.1): paid, the beneficiary books without
  // paying; anything else is said out loud and the flow stays at the general price.
  if (online && bono) {
    const giftCode = bono.toUpperCase();
    try {
      const g = GIFT_CODE_RE.test(giftCode) ? await redeemableGift(giftCode) : ({ state: "not_found" } as const);
      if (g.state === "ready") {
        voucher = { code: g.order.code, buyerName: g.order.buyerName };
      } else if (g.state === "not_found") {
        campaignNotice = "El enlace del regalo no es válido. Lo que reserves aquí va al precio general.";
      } else if (g.state === "redeemed") {
        campaignNotice = "Este bono de regalo ya fue canjeado. Lo que reserves aquí va al precio general.";
      } else if (g.state === "pending") {
        campaignNotice = "Este bono de regalo aún no está confirmado como pagado. Lo que reserves aquí va al precio general.";
      } else {
        campaignNotice = "Este bono de regalo fue cancelado. Lo que reserves aquí va al precio general.";
      }
    } catch (err) {
      console.error("agenda: gift lookup failed", err);
      campaignNotice = "No pudimos comprobar el bono de regalo. Lo que reserves aquí va al precio general; escríbenos si tenías un bono.";
    }
  }

  if (online && campana && !voucher) {
    const code = campana.toUpperCase();
    try {
      const q = CAMPAIGN_CODE_RE.test(code) ? await quote(code, null) : ({ state: "not_found" } as const);
      const general = `Lo que reserves aquí va al precio general de ${formatCOP(FIRST_SESSION.price)}.`;
      if (q.state === "active") {
        offer = {
          code: q.campaign.code,
          name: q.campaign.name,
          priceCop: q.campaign.priceCop,
          closesAt: q.campaign.closesAt?.toISOString() ?? null,
        };
      } else if (q.state === "not_found") {
        campaignNotice = `El enlace del encuentro no corresponde a una campaña. ${general}`;
      } else if (q.state === "interest") {
        campaignNotice = `La oferta del encuentro «${q.campaign.name}» todavía no se ha activado: Liliana la abre cuando confirma el grupo. ${general}`;
      } else if (q.state === "expired") {
        campaignNotice = `El plazo de la oferta del encuentro «${q.campaign.name}» terminó. ${general}`;
      } else if (q.state === "sold_out") {
        campaignNotice = `Los cupos de la oferta del encuentro «${q.campaign.name}» se agotaron. ${general}`;
      } else {
        campaignNotice = `La oferta del encuentro «${q.campaign.name}» está cerrada. ${general}`;
      }
    } catch (err) {
      console.error("agenda: campaign lookup failed", err);
      campaignNotice = "No pudimos comprobar la oferta del encuentro. Lo que reserves aquí va al precio general; escríbenos si tenías una tarifa.";
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold text-foreground">
        Agenda tu sesión con Liliana Tobón
      </h1>
      <p className="mt-2 text-muted-foreground">
        {online
          ? "Elige tu sesión, la fecha y la hora. Tu cita queda confirmada cuando Liliana verifique el pago."
          : ACTIVE_SERVICES.length === 0
            ? "Las reservas están en pausa por ahora. Escríbenos por WhatsApp si quieres una fecha."
            : "Escríbenos por WhatsApp y te compartimos los horarios disponibles."}
      </p>

      {campaignNotice && (
        <p role="status" data-testid="campaign-notice" className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-ink">
          {campaignNotice}
        </p>
      )}

      {online ? (
        <Suspense fallback={<AgendaSkeleton />}>
          <AgendaFlow slots={slots} holdHours={holdHours()} offer={voucher ? null : offer} voucher={voucher} brebAvailable={paymentInstructions() !== null} />
        </Suspense>
      ) : (
        <div className="mt-8" data-testid="agenda-fallback">
          <Button asChild size="lg">
            <a
              href={whatsappUrl(
                "Hola, quiero consultar los horarios disponibles para una sesión de numerología.",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-5" aria-hidden />
              Consultar horarios por WhatsApp
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
