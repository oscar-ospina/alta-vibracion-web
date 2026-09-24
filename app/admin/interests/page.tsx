import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@saas/ui";
import type { Interest } from "@/db/schema";
import { hasDatabase } from "@/db/client";
import { adminNotice } from "@/lib/agenda/labels";
import { BOGOTA, formatInZone } from "@/lib/agenda/time";
import { findService } from "@/lib/catalog";
import { displayContact } from "@/lib/contact";
import { listInterests } from "@/lib/interests";
import { createGiftFromInterestAction, markInterest } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Intereses",
  robots: { index: false, follow: false },
};

const LINK = "text-brand-ink underline underline-offset-2";

type ListKind = "gift" | "service" | "company";

const SECTIONS: { kind: ListKind; title: string; hint: string; testId: string }[] = [
  {
    kind: "gift",
    title: "Regalos por consultar",
    hint: "Personas que quieren regalar Mi Mapa 729. Confirma precio, capacidad, forma de entrega y condiciones antes de dar instrucciones de pago. No pidas datos de la otra persona hasta que acepte.",
    testId: "interests-gift",
  },
  {
    kind: "service",
    title: "Interés por próximos servicios",
    hint: "Avisar solo de la propuesta que pidieron, cuando esté lista. No es suscripción a un boletín.",
    testId: "interests-service",
  },
  {
    kind: "company",
    title: "Empresas",
    hint: "Organización y tema que quieren explorar. Nunca perfiles de empleados.",
    testId: "interests-company",
  },
];

function InterestList({ rows, testId }: { rows: Interest[]; testId: string }) {
  if (rows.length === 0) return <p className="mt-2 text-sm text-muted-foreground">Nada pendiente.</p>;
  return (
    <ul className="mt-2 space-y-2 text-sm" data-testid={testId}>
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg border px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="whitespace-nowrap text-muted-foreground">{formatInZone(r.createdAt, BOGOTA)}</span>
            <span className="font-semibold">{r.preferredName}</span>
            <span>{displayContact(r.contactChannel, r.contactValue)}</span>
            <span className="text-muted-foreground">{findService(r.serviceId)?.name ?? r.serviceId}</span>
            {r.origin && <span className="text-muted-foreground">origen: {r.origin}</span>}
            <span className="ml-auto flex gap-2">
              {r.kind === "gift" && (
                <form action={createGiftFromInterestAction}>
                  <input type="hidden" name="interestId" value={r.id} />
                  <Button size="sm" type="submit">Crear orden de regalo</Button>
                </form>
              )}
              <form action={markInterest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="contacted" />
                <Button size="sm" type="submit">Contactado</Button>
              </form>
              <form action={markInterest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="closed" />
                <Button size="sm" variant="outline" type="submit">Cerrar</Button>
              </form>
            </span>
          </div>
          {(r.organization || r.topic || r.message) && (
            <p className="mt-1 text-muted-foreground">
              {r.organization && <span className="font-medium text-foreground">{r.organization}. </span>}
              {r.topic}
              {r.message}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The plan's interest views (section 10): gifts to consult, interest in
 * future services, companies. Marking a row contacted or closed only records
 * that Liliana did it; it never sends anything.
 */
export default async function AdminInterestsPage({
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
  let lists: Record<ListKind, Interest[]>;
  try {
    const [gift, service, company] = await Promise.all([
      listInterests("gift"),
      listInterests("service"),
      listInterests("company"),
    ]);
    lists = { gift, service, company };
  } catch (err) {
    console.error("admin: interests unavailable", err);
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
      <h1 className="mt-4 text-3xl font-bold text-foreground">Intereses</h1>
      <p className="mt-2 text-muted-foreground">
        Registros voluntarios, no ventas ni reservas. Marcar «Contactado» o «Cerrar» solo
        anota que lo hiciste; no envía ningún mensaje.
      </p>
      {notice && (
        <p role="alert" data-testid="admin-notice" className="mt-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-brand-ink">
          {notice}
        </p>
      )}
      {SECTIONS.map((s) => (
        <section key={s.kind}>
          <h2 className="mt-10 text-xl font-bold text-foreground">{s.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{s.hint}</p>
          <InterestList rows={lists[s.kind]} testId={s.testId} />
        </section>
      ))}
    </div>
  );
}
