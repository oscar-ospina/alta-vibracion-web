import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, CardContent, Input, Label, cn } from "@saas/ui";
import type { GiftOrder } from "@/db/schema";
import { hasDatabase } from "@/db/client";
import { GIFT_STATUS_LABEL, adminNotice } from "@/lib/agenda/labels";
import { BOGOTA, formatInZone } from "@/lib/agenda/time";
import { listCampaigns, summarize } from "@/lib/campaigns";
import { FIRST_SESSION, formatCOP } from "@/lib/catalog";
import { displayContact } from "@/lib/contact";
import { type GiftCapacity, giftCapacity, listGiftOrders, listGiftsToSchedule } from "@/lib/gifts";
import { SITE_URL } from "@/lib/site";
import { createGiftOrderAction, setGiftStatusAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Regalos",
  robots: { index: false, follow: false },
};

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";
const LINK = "text-brand-ink underline underline-offset-2";

function GiftRow({ g }: { g: GiftOrder }) {
  const link = `${SITE_URL}/regalar/${g.code}`;
  return (
    <li className="rounded-lg border px-3 py-2 text-sm" data-code={g.code} data-testid="gift-row">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="whitespace-nowrap text-muted-foreground">{formatInZone(g.createdAt, BOGOTA)}</span>
        <span className="font-mono font-semibold">{g.code}</span>
        <span>{g.buyerName}</span>
        <span className="text-muted-foreground">{displayContact(g.buyerContactChannel, g.buyerContactValue)}</span>
        <span>{formatCOP(g.priceCop)}</span>
        <span className="font-semibold" data-testid="gift-status">{GIFT_STATUS_LABEL[g.status]}</span>
        <span className="ml-auto flex gap-2">
          {g.status === "pending_payment" && (
            <form action={setGiftStatusAction}>
              <input type="hidden" name="id" value={g.id} />
              <input type="hidden" name="status" value="paid" />
              <Button size="sm" type="submit">Pago verificado</Button>
            </form>
          )}
          {(g.status === "pending_payment" || g.status === "paid") && (
            <form action={setGiftStatusAction}>
              <input type="hidden" name="id" value={g.id} />
              <input type="hidden" name="status" value="cancelled" />
              <Button size="sm" variant="outline" type="submit">Cancelar</Button>
            </form>
          )}
          {(g.status === "paid" || g.status === "redeemed") && (
            <form action={setGiftStatusAction}>
              <input type="hidden" name="id" value={g.id} />
              <input type="hidden" name="status" value="refunded" />
              <Button size="sm" variant="outline" type="submit">Reembolsado</Button>
            </form>
          )}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">
        Invitación para compartir: <code className="font-mono" data-testid="gift-link">{link}</code>
        {g.message && <span className="block">Mensaje: {g.message}</span>}
      </p>
    </li>
  );
}

/**
 * Gift orders (plan section 7.1): create one after confirming price,
 * capacity, delivery and conditions with the buyer; mark it paid only after
 * seeing the transfer; share the invitation link. "Regalos por agendar" and
 * the capacity warning keep Liliana from selling more than she can deliver.
 */
export default async function AdminGiftsPage({
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
  let orders: GiftOrder[];
  let toSchedule: GiftOrder[];
  let capacity: GiftCapacity;
  let giftCampaigns: { id: string; name: string; priceCop: number }[];
  try {
    const now = new Date();
    const campaigns = await Promise.all((await listCampaigns()).map((c) => summarize(c, now)));
    giftCampaigns = campaigns
      .filter((s) => s.view === "active" && s.campaign.allowsGift)
      .map((s) => ({ id: s.campaign.id, name: s.campaign.name, priceCop: s.campaign.priceCop }));
    [orders, toSchedule, capacity] = await Promise.all([listGiftOrders(), listGiftsToSchedule(), giftCapacity(now)]);
  } catch (err) {
    console.error("admin: gifts unavailable", err);
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p>No se pudo consultar la base de datos. Revisa DATABASE_URL y las migraciones.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10">
      <p className="text-sm">
        <Link href="/admin" className={LINK}>← Agenda</Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Regalos</h1>
      <p className="mt-2 text-muted-foreground">
        Crea la orden cuando hayas confirmado precio, capacidad, forma de entrega y condiciones con
        quien regala. Marca «Pago verificado» solo tras ver el ingreso. La venta se registra aquí una
        vez; la cita de la persona que recibe el regalo no es otra venta.
      </p>
      {notice && (
        <p role="alert" data-testid="admin-notice" className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-ink">
          {notice}
        </p>
      )}

      <p
        role={capacity.short ? "alert" : undefined}
        data-testid="gift-capacity"
        className={cn(
          "mt-4 rounded-lg px-4 py-3 text-sm",
          capacity.short ? "bg-red-50 font-semibold text-red-800" : "bg-neutral-100 text-muted-foreground",
        )}
      >
        Bonos pagados sin horario: {capacity.unscheduled}. Horarios libres en los próximos 30 días:{" "}
        {capacity.freeSlots}.
        {capacity.short && " Hay más bonos que horarios: abre disponibilidad antes de vender otro."}
      </p>

      <h2 className="mt-8 text-xl font-bold text-foreground">Nueva orden de regalo</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createGiftOrderAction} className="grid gap-4 md:grid-cols-3" data-testid="gift-form">
            <div>
              <Label htmlFor="g-name">Quien regala</Label>
              <Input id="g-name" name="buyerName" maxLength={80} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="g-channel">Canal</Label>
              <select id="g-channel" name="buyerContactChannel" className={cn("mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm", FOCUS_RING)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Correo</option>
              </select>
            </div>
            <div>
              <Label htmlFor="g-contact">Contacto</Label>
              <Input id="g-contact" name="buyerContactValue" maxLength={120} required className="mt-2" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <Label htmlFor="g-price">Precio (COP)</Label>
              <Input id="g-price" name="priceCop" type="number" min={0} defaultValue={FIRST_SESSION.price} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="g-campaign">Tarifa de encuentro (solo campañas que lo permiten)</Label>
              <select id="g-campaign" name="campaignId" className={cn("mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm", FOCUS_RING)}>
                <option value="">Ninguna · precio general</option>
                {giftCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {formatCOP(c.priceCop)}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name="paid" className={cn("accent-orange-700", FOCUS_RING)} />
              Pago verificado
            </label>
            <div className="md:col-span-3">
              <Label htmlFor="g-message">Mensaje o dedicatoria (lo lee quien recibe el regalo)</Label>
              <textarea id="g-message" name="message" rows={2} maxLength={500} className={cn("mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm", FOCUS_RING)} />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="g-conditions">Condiciones acordadas (vigencia, cambios, devolución)</Label>
              <textarea id="g-conditions" name="conditions" rows={2} maxLength={2000} className={cn("mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm", FOCUS_RING)} />
            </div>
            <div>
              <Button type="submit">Crear orden</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-xl font-bold text-foreground">Regalos por agendar</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bonos pagados cuya persona aún no eligió horario. Comparte la invitación; ella agenda por sí
        misma, o crea la reserva a mano con el código del bono.
      </p>
      {toSchedule.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Ninguno pendiente.</p>
      ) : (
        <ul className="mt-2 space-y-2" data-testid="gifts-to-schedule">
          {toSchedule.map((g) => <GiftRow key={g.id} g={g} />)}
        </ul>
      )}

      <h2 className="mt-10 text-xl font-bold text-foreground">Todas las órdenes</h2>
      {orders.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Ninguna orden todavía.</p>
      ) : (
        <ul className="mt-2 space-y-2" data-testid="gift-orders">
          {orders.map((g) => <GiftRow key={g.id} g={g} />)}
        </ul>
      )}
    </div>
  );
}
