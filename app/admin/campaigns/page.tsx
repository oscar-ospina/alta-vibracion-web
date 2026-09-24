import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, CardContent, Input, Label, cn } from "@saas/ui";
import { hasDatabase } from "@/db/client";
import { ADMIN_NOTICE, CAMPAIGN_STATUS_LABEL, type AdminNoticeKey } from "@/lib/agenda/labels";
import { BOGOTA, formatInZone } from "@/lib/agenda/time";
import { type CampaignSummary, DEFAULT_WINDOW_HOURS, listCampaigns, summarize } from "@/lib/campaigns";
import { formatCOP } from "@/lib/catalog";
import { displayContact } from "@/lib/contact";
import { listCampaignInterests } from "@/lib/interests";
import { SITE_URL } from "@/lib/site";
import { activateCampaignAction, closeCampaignAction, createCampaignAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Campañas",
  robots: { index: false, follow: false },
};

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";
const LINK = "text-brand-ink underline underline-offset-2";

const VIEW_LABEL = {
  interest: "Recogiendo interés",
  active: "Activa",
  expired: "Activa · plazo vencido",
  sold_out: "Activa · cupos agotados",
  closed: "Cerrada",
} as const;

async function CampaignCard({ s }: { s: CampaignSummary }) {
  const c = s.campaign;
  const registered = await listCampaignInterests(c.id);
  const link = `${SITE_URL}/encuentros/${c.code}`;
  return (
    <li className="rounded-xl border p-4" data-code={c.code} data-testid="campaign-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-foreground">{c.name}</h3>
        <span className="font-semibold" data-testid="campaign-status">{VIEW_LABEL[s.view]}</span>
      </div>
      <p className="mt-1 text-sm">
        Enlace para el QR: <code className="font-mono" data-testid="campaign-link">{link}</code>
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Precio de campaña</dt><dd>{formatCOP(c.priceCop)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Umbral</dt><dd>{c.threshold} personas</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Registrados</dt><dd data-testid="campaign-registered">{s.registered}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Cupos usados</dt><dd data-testid="campaign-used">{s.promoUsed} de {c.capacity}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Regalo con tarifa</dt><dd>{c.allowsGift ? "Sí" : "No"}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Estado guardado</dt><dd>{CAMPAIGN_STATUS_LABEL[c.status]}</dd></div>
        {c.opensAt && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Activada</dt><dd>{formatInZone(c.opensAt, BOGOTA)}</dd></div>}
        {c.closesAt && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Cierre de compra</dt><dd>{formatInZone(c.closesAt, BOGOTA)}</dd></div>}
      </dl>
      {registered.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className={cn("cursor-pointer font-semibold", FOCUS_RING)}>Personas registradas ({registered.length})</summary>
          <ul className="mt-2 space-y-1" data-testid="campaign-people">
            {registered.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-3">
                <span>{r.preferredName}</span>
                <span className="text-muted-foreground">{displayContact(r.contactChannel, r.contactValue)}</span>
                <span className="text-muted-foreground">{formatInZone(r.createdAt, BOGOTA)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        {c.status === "interest" && (
          <form action={activateCampaignAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={c.id} />
            <div>
              <Label htmlFor={`close-${c.id}`}>Cierre de compra (hora de Colombia, vacío = {DEFAULT_WINDOW_HOURS} h)</Label>
              <Input id={`close-${c.id}`} name="closesAt" type="datetime-local" className="mt-2" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="force" className={cn("accent-orange-700", FOCUS_RING)} />
              Activar aunque no se alcance el umbral
            </label>
            <Button type="submit">Activar campaña</Button>
          </form>
        )}
        {c.status !== "closed" && (
          <form action={closeCampaignAction}>
            <input type="hidden" name="id" value={c.id} />
            <Button type="submit" variant="outline">Cerrar campaña</Button>
          </form>
        )}
      </div>
    </li>
  );
}

/**
 * Campaign management (plan sections 5, 9 and 12 row 2). Liliana creates a
 * campaign with her values, prints the link, checks the registered people and
 * activates by hand. Prices on issued orders never change from here.
 */
export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const notice = aviso && aviso in ADMIN_NOTICE ? ADMIN_NOTICE[aviso as AdminNoticeKey] : null;
  if (!hasDatabase()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p>Sin base de datos configurada (DATABASE_URL).</p>
      </div>
    );
  }
  let summaries: CampaignSummary[];
  try {
    const now = new Date();
    summaries = await Promise.all((await listCampaigns()).map((c) => summarize(c, now)));
  } catch (err) {
    console.error("admin: campaigns unavailable", err);
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
      <h1 className="mt-4 text-3xl font-bold text-foreground">Campañas de encuentro</h1>
      <p className="mt-2 text-muted-foreground">
        Crea la campaña antes del evento, comparte el enlace por QR, revisa quién se registró y
        actívala tú misma. Una orden emitida conserva su precio aunque cambies la campaña.
      </p>
      {notice && (
        <p role="alert" data-testid="admin-notice" className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-ink">
          {notice}
        </p>
      )}

      <h2 className="mt-8 text-xl font-bold text-foreground">Nueva campaña</h2>
      <Card className="mt-3">
        <CardContent>
          <form action={createCampaignAction} className="grid gap-4 md:grid-cols-2" data-testid="campaign-form">
            <div className="md:col-span-2">
              <Label htmlFor="c-name">Nombre del encuentro</Label>
              <Input id="c-name" name="name" maxLength={120} required className="mt-2" placeholder="Encuentro en casa de …" />
            </div>
            <div>
              <Label htmlFor="c-price">Precio de campaña (COP)</Label>
              <Input id="c-price" name="priceCop" type="number" min={1} defaultValue={98900} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="c-threshold">Umbral de personas</Label>
              <Input id="c-threshold" name="threshold" type="number" min={1} defaultValue={3} required className="mt-2" />
            </div>
            <div>
              <Label htmlFor="c-capacity">Cupos promocionales</Label>
              <Input id="c-capacity" name="capacity" type="number" min={1} defaultValue={3} required className="mt-2" />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name="allowsGift" className={cn("accent-orange-700", FOCUS_RING)} />
              Permitir regalo con esta tarifa
            </label>
            <div className="md:col-span-2">
              <Label htmlFor="c-conditions">Condiciones visibles</Label>
              <textarea
                id="c-conditions"
                name="conditions"
                rows={4}
                maxLength={4000}
                className={cn("mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm", FOCUS_RING)}
                placeholder="Una primera sesión por persona. Fechas disponibles en los 30 días siguientes. Cambios y devoluciones: …"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Crear campaña</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-xl font-bold text-foreground">Campañas</h2>
      {summaries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Ninguna campaña todavía.</p>
      ) : (
        <ul className="mt-3 space-y-4" data-testid="campaign-list">
          {summaries.map((s) => (
            <CampaignCard key={s.campaign.id} s={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
