/**
 * Database tests. Need DATABASE_URL pointing at a migrated Postgres (see
 * docs/agenda-setup.md). They truncate the bookings and overrides tables.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { getDb, schema } from "../../db/client";
import { resetAgenda as reset } from "./helpers";
import { computeSlots, loadAvailability } from "../../lib/agenda/availability";
import { createBooking, createManualBooking, setBookingStatus } from "../../lib/agenda/bookings";
import { bogotaInstant, formatInZone } from "../../lib/agenda/time";



const db = getDb();


const input = (startsAt: string, name = "Ana") => ({
  serviceId: "yo-01",
  startsAt,
  customerName: name,
  contactChannel: "whatsapp" as const,
  contactValue: "+57 300 000 0000",
  clientTimeZone: "America/Bogota",
  origin: "test",
});

describe("time zones", () => {
  it("maps the plan's example: 2026-09-22 18:00 Bogotá is 2026-09-23 01:00 Madrid", () => {
    const instant = bogotaInstant("2026-09-22", "18:00");
    assert.equal(instant.toISOString(), "2026-09-22T23:00:00.000Z");
    const madrid = formatInZone(instant, "Europe/Madrid");
    assert.match(madrid, /23 de septiembre/);
    assert.match(madrid, /1:00/);
  });
});

describe("computeSlots", () => {
  const now = new Date("2026-09-17T15:00:00Z");
  const rules = [1, 2, 3, 4].map((weekday) => ({
    weekday,
    time: "18:00",
    durationMinutes: 135,
    active: true,
  }));

  it("offers Monday to Thursday at 18:00 only", () => {
    const slots = computeSlots({ rules, overrides: [], bookings: [], from: "2026-09-21", to: "2026-09-27", now });
    assert.deepEqual(
      slots.map((s) => `${s.date} ${s.time}`),
      ["2026-09-21 18:00", "2026-09-22 18:00", "2026-09-23 18:00", "2026-09-24 18:00"],
    );
  });

  it("honours closed days, closed times and extra slots", () => {
    const slots = computeSlots({
      rules,
      overrides: [
        { date: "2026-09-21", kind: "closed", time: null, durationMinutes: null },
        { date: "2026-09-22", kind: "closed", time: "18:00", durationMinutes: null },
        { date: "2026-09-26", kind: "extra", time: "09:00", durationMinutes: 75 },
      ],
      bookings: [],
      from: "2026-09-21",
      to: "2026-09-27",
      now,
    });
    assert.deepEqual(
      slots.map((s) => `${s.date} ${s.time}`),
      ["2026-09-23 18:00", "2026-09-24 18:00", "2026-09-26 09:00"],
    );
  });

  it("hides slots held or confirmed, but not expired or cancelled ones", () => {
    const at = (d: string) => bogotaInstant(d, "18:00");
    const end = (d: string) => bogotaInstant(d, "20:15");
    const past = new Date(now.getTime() - 1000);
    const future = new Date(now.getTime() + 1000);
    const slots = computeSlots({
      rules,
      overrides: [],
      bookings: [
        { startsAt: at("2026-09-21"), endsAt: end("2026-09-21"), status: "confirmed", holdExpiresAt: past },
        { startsAt: at("2026-09-22"), endsAt: end("2026-09-22"), status: "pending_payment", holdExpiresAt: future },
        { startsAt: at("2026-09-23"), endsAt: end("2026-09-23"), status: "pending_payment", holdExpiresAt: past },
        { startsAt: at("2026-09-24"), endsAt: end("2026-09-24"), status: "cancelled", holdExpiresAt: past },
      ],
      from: "2026-09-21",
      to: "2026-09-27",
      now,
    });
    assert.deepEqual(slots.map((s) => s.date), ["2026-09-23", "2026-09-24"]);
  });
});

describe("computeSlots overlap", () => {
  const now = new Date("2026-09-17T15:00:00Z");
  const rules = [{ weekday: 1, time: "18:00", durationMinutes: 135, active: true }];

  it("drops an extra slot that overlaps a regular one the same day", () => {
    const slots = computeSlots({
      rules,
      overrides: [{ date: "2026-09-21", kind: "extra", time: "19:00", durationMinutes: 135 }],
      bookings: [],
      from: "2026-09-21",
      to: "2026-09-21",
      now,
    });
    assert.deepEqual(slots.map((s) => s.time), ["18:00"]);
  });

  it("hides a slot that overlaps a live booking with a different start", () => {
    const slots = computeSlots({
      rules,
      overrides: [{ date: "2026-09-21", kind: "extra", time: "14:00", durationMinutes: 135 }],
      bookings: [
        {
          startsAt: bogotaInstant("2026-09-21", "17:00"),
          endsAt: bogotaInstant("2026-09-21", "18:30"),
          status: "confirmed",
          holdExpiresAt: now,
        },
      ],
      from: "2026-09-21",
      to: "2026-09-21",
      now,
    });
    assert.deepEqual(slots.map((s) => s.time), ["14:00"]);
  });
});

describe("createBooking", () => {
  before(reset);
  beforeEach(reset);
  after(async () => {
    await reset();
  });

  it("books an offered slot and removes it from availability", async () => {
    const [slot] = await loadAvailability();
    const res = await createBooking(input(slot.startsAt));
    assert.ok(res.ok);
    if (!res.ok) return;
    assert.match(res.booking.code, /^AV-[A-Z2-9]{6}$/);
    assert.equal(res.booking.status, "pending_payment");
    assert.equal(res.booking.priceCop, 149900);
    const after = await loadAvailability();
    assert.ok(!after.some((s) => s.startsAt === slot.startsAt));
  });

  it("rejects a slot that is not offered", async () => {
    const res = await createBooking(input(bogotaInstant("2026-01-03", "18:00").toISOString()));
    assert.deepEqual(res, { ok: false, error: "unavailable" });
  });

  it("rejects unknown and not-yet-active services", async () => {
    const [slot] = await loadAvailability();
    // The retired gift id no longer exists as a service.
    const res = await createBooking({ ...input(slot.startsAt), serviceId: "reg-01" });
    assert.deepEqual(res, { ok: false, error: "invalid_service" });
    // A service in preparation (plan section 13, first test) is rejected server-side.
    const future = await createBooking({ ...input(slot.startsAt), serviceId: "yo-02" });
    assert.deepEqual(future, { ok: false, error: "invalid_service" });
    const egyptian = await createBooking({ ...input(slot.startsAt), serviceId: "yo-03" });
    assert.deepEqual(egyptian, { ok: false, error: "invalid_service" });
  });

  it("lets exactly one of two concurrent bookings win the same slot", async () => {
    const [slot] = await loadAvailability();
    const results = await Promise.all([
      createBooking(input(slot.startsAt, "Uno")),
      createBooking(input(slot.startsAt, "Dos")),
    ]);
    const winners = results.filter((r) => r.ok);
    const losers = results.filter((r) => !r.ok);
    assert.equal(winners.length, 1);
    assert.equal(losers.length, 1);
    assert.ok(!losers[0].ok && losers[0].error === "slot_taken");
  });

  it("caps live holds per contact", async () => {
    const slots = await loadAvailability();
    const a = await createBooking(input(slots[0].startsAt));
    const b = await createBooking(input(slots[1].startsAt));
    const c = await createBooking(input(slots[2].startsAt));
    assert.ok(a.ok && b.ok);
    assert.deepEqual(c, { ok: false, error: "too_many" });
  });

  it("the database rejects an overlapping booking even with a different start", async () => {
    const [slot] = await loadAvailability();
    const first = await createBooking(input(slot.startsAt));
    assert.ok(first.ok);
    const start = new Date(new Date(slot.startsAt).getTime() + 30 * 60_000);
    await assert.rejects(
      db.insert(schema.bookings).values({
        code: "AV-TESTXX",
        serviceId: "yo-01",
        priceCop: 1,
        startsAt: start,
        endsAt: new Date(start.getTime() + 60 * 60_000),
        holdExpiresAt: new Date(Date.now() + 3_600_000),
        customerName: "X",
        contactChannel: "email",
        contactValue: "x@example.com",
        clientTimeZone: "America/Bogota",
      }),
      (err: unknown) => /bookings_no_overlap/.test(String((err as Error).cause ?? err)),
    );
  });

  it("frees the slot once the hold expires, and sweeps the old row", async () => {
    const [slot] = await loadAvailability();
    const past = new Date(Date.now() - 48 * 3600 * 1000);
    const first = await createBooking(input(slot.startsAt), past);
    assert.ok(first.ok);
    const second = await createBooking(input(slot.startsAt, "Nueva"));
    assert.ok(second.ok);
    const rows = await db.select().from(schema.bookings);
    const statuses = rows.map((r) => r.status).sort();
    assert.deepEqual(statuses, ["expired", "pending_payment"]);
  });

  it("refuses to confirm an expired hold, and never revives it over a newer booking", async () => {
    const [slot] = await loadAvailability();
    const past = new Date(Date.now() - 48 * 3600 * 1000);
    const old = await createBooking(input(slot.startsAt, "Tarde"), past);
    assert.ok(old.ok);
    if (!old.ok) return;
    const fresh = await createBooking(input(slot.startsAt, "Nueva"));
    assert.ok(fresh.ok);
    const res = await setBookingStatus(old.booking.id, "confirmed");
    assert.deepEqual(res, { ok: false, error: "not_pending" });
    const rows = await db.select().from(schema.bookings);
    assert.equal(rows.filter((r) => r.status === "confirmed").length, 0);
  });

  it("refuses to confirm a pending hold whose time has lapsed", async () => {
    const [slot] = await loadAvailability();
    const past = new Date(Date.now() - 48 * 3600 * 1000);
    const old = await createBooking(input(slot.startsAt, "Tarde"), past);
    assert.ok(old.ok);
    if (!old.ok) return;
    const res = await setBookingStatus(old.booking.id, "confirmed");
    assert.deepEqual(res, { ok: false, error: "hold_expired" });
  });

  it("keeps a confirmed slot blocked even after the hold window", async () => {
    const [slot] = await loadAvailability();
    const past = new Date(Date.now() - 48 * 3600 * 1000);
    const first = await createBooking(input(slot.startsAt), past);
    assert.ok(first.ok);
    if (!first.ok) return;
    // Confirm while the hold is alive (the row was created 48 h ago with a 24 h hold,
    // so pass a "now" inside that window).
    const confirmed = await setBookingStatus(first.booking.id, "confirmed", new Date(past.getTime() + 3600 * 1000));
    assert.ok(confirmed.ok);
    const second = await createBooking(input(slot.startsAt, "Nueva"));
    assert.deepEqual(second, { ok: false, error: "unavailable" });
  });
});

describe("createManualBooking", () => {
  beforeEach(reset);
  after(reset);

  const manual = (date: string, time: string, paid = false) => ({
    customerName: "Pago tardío",
    contactChannel: "whatsapp" as const,
    contactValue: "573001234567",
    date,
    time,
    priceCop: 149900,
    paid,
  });

  it("books any future Bogotá time, confirmed when the payment was verified, and takes the slot", async () => {
    const now = new Date("2026-10-01T12:00:00Z");
    // A Friday at 10:00: not an offered slot, allowed by hand.
    const res = await createManualBooking(manual("2026-10-02", "10:00", true), now);
    assert.ok(res.ok);
    assert.equal(res.booking.status, "confirmed");
    assert.equal(res.booking.confirmedAt?.toISOString(), now.toISOString());
    assert.equal(res.booking.origin, "manual");
    assert.equal(res.booking.startsAt.toISOString(), "2026-10-02T15:00:00.000Z");

    const pending = await createManualBooking({ ...manual("2026-10-05", "18:00"), note: "regalo-AV-ABC123" }, now);
    assert.ok(pending.ok);
    assert.equal(pending.booking.status, "pending_payment");
    assert.equal(pending.booking.origin, "manual:regalo-AV-ABC123");
    // The public agenda no longer offers that Monday.
    const offered = await loadAvailability(now);
    assert.ok(!offered.some((s) => s.date === "2026-10-05"));
  });

  it("never double-books: the same guard as the public flow", async () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const [slot] = await loadAvailability(now);
    const pub = await createBooking(input(slot.startsAt), now);
    assert.ok(pub.ok);
    const clash = await createManualBooking(manual(slot.date, slot.time, true), now);
    assert.deepEqual(clash, { ok: false, error: "slot_taken" });
    // Overlapping (18:30 inside the 18:00 block) is refused too.
    const overlap = await createManualBooking(manual(slot.date, "18:30", true), now);
    assert.deepEqual(overlap, { ok: false, error: "slot_taken" });
  });

  it("rejects the past and bad values", async () => {
    const now = new Date("2026-10-01T12:00:00Z");
    assert.deepEqual(await createManualBooking(manual("2026-09-30", "18:00"), now), { ok: false, error: "past" });
    assert.deepEqual(await createManualBooking({ ...manual("2026-10-06", "18:00"), priceCop: -1 }, now), { ok: false, error: "bad_values" });
    assert.deepEqual(await createManualBooking({ ...manual("2026-10-06", "18:00"), customerName: "A" }, now), { ok: false, error: "bad_values" });
  });
});
