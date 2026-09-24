import { NextResponse, type NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, hasDatabase, schema } from "@/db/client";
import { isAuthorized } from "@/lib/admin-auth";
import { BOGOTA } from "@/lib/agenda/time";
import { bookingServiceLabel } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * CSV export for Liliana's own records and weekly backup (plan sections 10
 * and 12, row 6). One file per table. Written for Excel in Spanish
 * (Colombia): UTF-8 with BOM so accents survive, a "sep=;" first line and ";"
 * as delimiter because the es-CO list separator is ";", instants as
 * "YYYY-MM-DD HH:mm" in Colombia time so they sort and re-import, and cells
 * that start with a formula character neutralized. The same Basic-auth check
 * as every admin action; proxy.ts only challenges page loads.
 *
 * Personal data leaves the database here on purpose, to the one person who
 * owns it. Nothing else downloads it.
 */
const TABLES = ["bookings", "interests", "campaigns", "gifts"] as const;
type Table = (typeof TABLES)[number];

const SEP = ";";

/** "2026-10-05 18:00" in Colombia time: sortable, re-importable, with the year. */
export function csvInstant(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? csvInstant(v) : String(v);
  // A cell that starts like a formula (=, +, -, @) would be evaluated by Excel;
  // a leading apostrophe makes it text. Phones are exported as stored digits.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(header: string[], rows: unknown[][]): string {
  // The BOM is written as an escape so no editor can strip it silently.
  const bom = "\u{FEFF}";
  return bom + `sep=${SEP}\r\n` + [header, ...rows].map((r) => r.map(csvCell).join(SEP)).join("\r\n") + "\r\n";
}

async function build(table: Table): Promise<{ header: string[]; rows: unknown[][] }> {
  const db = getDb();
  switch (table) {
    case "bookings": {
      const rows = await db.select().from(schema.bookings).orderBy(desc(schema.bookings.startsAt));
      return {
        header: ["codigo", "sesion", "precio_cop", "inicio_colombia", "estado", "cliente", "canal", "contacto_digitos", "zona_cliente", "origen", "campana_id", "bono_id", "creada", "confirmada", "formulario", "atendida", "seguimiento"],
        rows: rows.map((b) => [
          b.code, bookingServiceLabel(b), b.priceCop, b.startsAt, b.status, b.customerName, b.contactChannel,
          b.contactValue, b.clientTimeZone, b.origin, b.campaignId, b.giftOrderId,
          b.createdAt, b.confirmedAt, b.intakeReceivedAt, b.attendedAt, b.followUpDoneAt,
        ]),
      };
    }
    case "interests": {
      const rows = await db.select().from(schema.interests).orderBy(desc(schema.interests.createdAt));
      return {
        header: ["tipo", "servicio", "nombre", "canal", "contacto_digitos", "organizacion", "tema", "mensaje", "consentimiento", "estado", "origen", "campana_id", "creado", "contactado", "cerrado"],
        rows: rows.map((r) => [
          r.kind, r.serviceId, r.preferredName, r.contactChannel, r.contactValue,
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
        header: ["id", "codigo", "precio_cop", "estado", "comprador", "canal", "contacto_digitos", "mensaje", "campana_id", "condiciones", "pagado", "canjeado", "creada"],
        rows: rows.map((g) => [
          g.id, g.code, g.priceCop, g.status, g.buyerName, g.buyerContactChannel,
          g.buyerContactValue, g.message, g.campaignId, g.conditions,
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
