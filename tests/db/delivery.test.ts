/**
 * Delivery marks and the report. Same requirements as agenda.test.ts: a local,
 * migrated Postgres in DATABASE_URL. Truncates reports, bookings and overrides.
 */
import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../../db/client";
import { loadAvailability } from "../../lib/agenda/availability";
import { createBooking, setBookingStatus } from "../../lib/agenda/bookings";
import {
  FOLLOW_UP_DAYS,
  deliveryStage,
  findApprovedReport,
  listFollowUpsDue,
  listPendingDeliveries,
  listPendingIntake,
  markAttended,
  markFollowUpDone,
  markIntakeReceived,
  reportTemplate,
  saveReport,
} from "../../lib/agenda/delivery";
import { addMinutes } from "../../lib/agenda/time";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests/db");
}

function assertDisposableDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (/neon\.tech|vercel|supabase|amazonaws/i.test(url) && process.env.ALLOW_DESTRUCTIVE_TESTS !== "1") {
    throw new Error("Refusing to truncate a managed database. Point DATABASE_URL at a local container.");
  }
}

const db = getDb();

async function reset() {
  assertDisposableDatabase();
  await db.execute(sql`truncate table interests, reports, bookings, availability_overrides`);
  await db.execute(sql`truncate table availability_rules restart identity`);
  await db.insert(schema.availabilityRules).values(
    [1, 2, 3, 4].map((weekday) => ({ weekday, time: "18:00", durationMinutes: 135 })),
  );
}

async function pendingBooking(index = 0, name = "Ana") {
  const slots = await loadAvailability();
  const res = await createBooking({
    serviceId: "yo-01",
    startsAt: slots[index].startsAt,
    customerName: name,
    contactChannel: "email",
    contactValue: `${name.toLowerCase()}@example.com`,
    clientTimeZone: "America/Bogota",
    origin: null,
  });
  if (!res.ok) throw new Error(`setup: ${res.error}`);
  return res.booking;
}

async function confirmedBooking(index = 0, name = "Ana") {
  const b = await pendingBooking(index, name);
  const res = await setBookingStatus(b.id, "confirmed");
  if (!res.ok) throw new Error(`setup: ${res.error}`);
  return res.booking;
}

async function reload(id: string) {
  const [row] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
  return row;
}

describe("delivery marks", () => {
  beforeEach(reset);
  after(reset);

  it("only a confirmed booking takes the intake and attended marks", async () => {
    const pending = await pendingBooking();
    assert.deepEqual(await markIntakeReceived(pending.id, true), { ok: false, error: "not_confirmed" });
    assert.deepEqual(await markAttended(pending.id), { ok: false, error: "not_confirmed" });
    assert.deepEqual(await markFollowUpDone(pending.id), { ok: false, error: "not_attended" });
  });

  it("sets and clears the intake mark", async () => {
    const b = await confirmedBooking();
    const on = await markIntakeReceived(b.id, true);
    assert.ok(on.ok && on.booking.intakeReceivedAt);
    const off = await markIntakeReceived(b.id, false);
    assert.ok(off.ok && off.booking.intakeReceivedAt === null);
  });

  it("attended is idempotent and blocks cancellation", async () => {
    const b = await confirmedBooking();
    const first = await markAttended(b.id, new Date("2026-09-22T23:00:00Z"));
    assert.ok(first.ok);
    const again = await markAttended(b.id, new Date("2026-09-23T00:00:00Z"));
    assert.ok(again.ok);
    assert.equal(again.booking.attendedAt?.toISOString(), "2026-09-22T23:00:00.000Z");
    assert.deepEqual(await setBookingStatus(b.id, "cancelled"), { ok: false, error: "attended" });
    assert.equal((await reload(b.id)).status, "confirmed");
  });

  it("stages follow the marks: confirmed → attended → delivered", async () => {
    const b = await confirmedBooking();
    assert.equal(deliveryStage(b, null), "confirmed");
    const attended = await markAttended(b.id);
    assert.ok(attended.ok);
    assert.equal(deliveryStage(attended.booking, null), "attended");
    const draft = await saveReport(b.id, { body: "Borrador", status: "draft" });
    assert.ok(draft.ok);
    assert.equal(deliveryStage(attended.booking, draft.report), "attended");
    const approved = await saveReport(b.id, { body: "Listo", status: "approved" });
    assert.ok(approved.ok);
    assert.equal(deliveryStage(attended.booking, approved.report), "delivered");
  });
});

describe("reports", () => {
  beforeEach(reset);
  after(reset);

  it("starts from the plan's template with the booking's own data", async () => {
    const b = await confirmedBooking();
    const t = reportTemplate(b);
    assert.match(t, new RegExp(`Código: ${b.code}`));
    assert.match(t, /Mi Mapa 729/);
    assert.match(t, /Tres acciones o preguntas/);
  });

  it("refuses to approve before the session took place, or with an empty body", async () => {
    const b = await confirmedBooking();
    assert.deepEqual(await saveReport(b.id, { body: "Texto", status: "approved" }), { ok: false, error: "not_attended" });
    assert.deepEqual(await saveReport(b.id, { body: "  \n ", status: "reviewed" }), { ok: false, error: "empty" });
    const draft = await saveReport(b.id, { body: "", status: "draft" });
    assert.ok(draft.ok, "an empty draft is allowed");
  });

  it("only an approved report is visible, and saving as draft withdraws it", async () => {
    const b = await confirmedBooking();
    await markAttended(b.id);
    await saveReport(b.id, { body: "Primera versión", status: "reviewed" });
    assert.equal(await findApprovedReport(b.id), null);
    const approved = await saveReport(b.id, { body: "Versión final", status: "approved" });
    assert.ok(approved.ok && approved.report.approvedAt);
    assert.equal((await findApprovedReport(b.id))?.body, "Versión final");
    const back = await saveReport(b.id, { body: "Corrigiendo", status: "draft" });
    assert.ok(back.ok && back.report.approvedAt === null);
    assert.equal(await findApprovedReport(b.id), null);
    const rows = await db.select().from(schema.reports).where(eq(schema.reports.bookingId, b.id));
    assert.equal(rows.length, 1, "one report per booking");
  });
});

describe("pending lists", () => {
  beforeEach(reset);
  after(reset);

  it("pending intake lists confirmed sessions without the mark, not pending or attended ones", async () => {
    const a = await confirmedBooking(0, "Ana");
    const b = await confirmedBooking(1, "Bea");
    await pendingBooking(2, "Caro");
    const c = await confirmedBooking(3, "Dora");
    await markIntakeReceived(b.id, true);
    await markAttended(c.id);
    const codes = (await listPendingIntake()).map((x) => x.code);
    assert.deepEqual(codes, [a.code]);
  });

  it("pending deliveries lists attended sessions until the report is approved", async () => {
    const a = await confirmedBooking(0, "Ana");
    const b = await confirmedBooking(1, "Bea");
    await confirmedBooking(2, "Caro");
    await markAttended(a.id);
    await markAttended(b.id);
    await saveReport(b.id, { body: "Borrador", status: "reviewed" });
    let rows = await listPendingDeliveries();
    assert.deepEqual(rows.map((r) => [r.booking.code, r.report?.status ?? null]), [
      [a.code, null],
      [b.code, "reviewed"],
    ]);
    await saveReport(b.id, { body: "Final", status: "approved" });
    rows = await listPendingDeliveries();
    assert.deepEqual(rows.map((r) => r.booking.code), [a.code]);
  });

  it(`follow-ups appear ${FOLLOW_UP_DAYS} days after the session and leave once marked`, async () => {
    const now = new Date("2026-10-20T15:00:00Z");
    const old = await confirmedBooking(0, "Ana");
    const recent = await confirmedBooking(1, "Bea");
    await markAttended(old.id, addMinutes(now, -(FOLLOW_UP_DAYS + 1) * 24 * 60));
    await markAttended(recent.id, addMinutes(now, -3 * 24 * 60));
    assert.deepEqual((await listFollowUpsDue(now)).map((x) => x.code), [old.code]);
    const done = await markFollowUpDone(old.id, now);
    assert.ok(done.ok);
    assert.deepEqual(await listFollowUpsDue(now), []);
    const again = await markFollowUpDone(old.id, addMinutes(now, 60));
    assert.ok(again.ok && again.booking.followUpDoneAt?.getTime() === now.getTime(), "the first mark stays");
  });
});
