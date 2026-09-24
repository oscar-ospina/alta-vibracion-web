import { NextResponse, type NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, hasDatabase, schema } from "@/db/client";
import { isAuthorized } from "@/lib/admin-auth";
import { BOGOTA, formatInZone } from "@/lib/agenda/time";
import { bookingServiceLabel } from "@/lib/catalog";
import { displayContact } from "@/lib/contact";

export const dynamic = "force-dynamic";

/**
 * CSV export for Liliana's own records and weekly backup (plan sections 10
 * and 12, row 6). One file per table, UTF-8 with BOM so Excel opens it with
 * accents intact, instants in Colombia time. The same Basic-auth check as
 * every admin action; proxy.ts only challenges page loads.
 *
 * Personal data leaves the database here on purpose, to the one person who
 * owns it. Nothing else downloads it.
 */
const TABLES = ["bookings", "interests", "campaigns", "gifts"] as const;
type Table = (typeof TABLES)[number];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? formatInZone(v, BOGOTA) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

async function build(table: Table): Promise<{ header: string[]; rows: unknown[][] }> {
  const db = getDb();
  switch (table) {
    case "bookings": {
      const rows = await db.select().from(schema.bookings).orderBy(desc(schema.bookings.startsAt));
      return {
        header: ["codigo", "sesion", "precio_cop", "inicio_colombia", "estado", "cliente", "canal", "contacto", "zona_cliente", "origen", "campana_id", "bono_id", "creada", "confirmada", "formulario", "atendida", "seguimiento"],
        rows: rows.map((b) => [
          b.code, bookingServiceLabel(b), b.priceCop, b.startsAt, b.status, b.customerName, b.contactChannel,
          displayContact(b.contactChannel, b.contactValue), b.clientTimeZone, b.origin, b.campaignId, b.giftOrderId,
          b.createdAt, b.confirmedAt, b.intakeReceivedAt, b.attendedAt, b.followUpDoneAt,
        ]),
      };
    }
    case "interests": {
      const rows = await db.select().from(schema.interests).orderBy(desc(schema.interests.createdAt));
      return {
        header: ["tipo", "servicio", "nombre", "canal", "contacto", "organizacion", "tema", "mensaje", "consentimiento", "estado", "origen", "campana_id", "creado", "contactado", "cerrado"],
        rows: rows.map((r) => [
          r.kind, r.serviceId, r.preferredName, r.contactChannel, displayContact(r.contactChannel, r.contactValue),
          r.organization, r.topic, r.message, r.consent ? "si" : "no", r.status, r.origin, r.campaignId,
          r.createdAt, r.contactedAt, r.closedAt,
        ]),
      };
    }
    case "campaigns": {
      const rows = await db.select().from(schema.campaigns).orderBy(desc(schema.campaigns.createdAt));
      return {
        header: ["id", "codigo", "nombre", "precio_cop", "umbral", "cupos", "estado", "activada", "cierre", "permite_regalo", "condiciones", "version_condiciones", "creada"],
        rows: rows.map((c) => [
          c.id, c.code, c.name, c.priceCop, c.threshold, c.capacity, c.status, c.opensAt, c.closesAt,
          c.allowsGift ? "si" : "no", c.conditions, c.conditionsVersion, c.createdAt,
        ]),
      };
    }
    case "gifts": {
      const rows = await db.select().from(schema.giftOrders).orderBy(desc(schema.giftOrders.createdAt));
      return {
        header: ["id", "codigo", "precio_cop", "estado", "comprador", "canal", "contacto", "mensaje", "campana_id", "condiciones", "pagado", "canjeado", "creada"],
        rows: rows.map((g) => [
          g.id, g.code, g.priceCop, g.status, g.buyerName, g.buyerContactChannel,
          displayContact(g.buyerContactChannel, g.buyerContactValue), g.message, g.campaignId, g.conditions,
          g.paidAt, g.redeemedAt, g.createdAt,
        ]),
      };
    }
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new NextResponse("Acceso restringido", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Alta Vibración admin", charset="UTF-8"' },
    });
  }
  const { table } = await params;
  if (!(TABLES as readonly string[]).includes(table)) return new NextResponse("No existe", { status: 404 });
  if (!hasDatabase()) return new NextResponse("Sin base de datos", { status: 503 });
  try {
    const { header, rows } = await build(table as Table);
    const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: BOGOTA }).format(new Date());
    return new NextResponse(csv(header, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="alta-vibracion-${table}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("admin: export failed", err);
    return new NextResponse("No se pudo exportar", { status: 500 });
  }
}
