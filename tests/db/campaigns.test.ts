/**
 * "Encuentro 729" campaigns (plan sections 5 and 13). Needs DATABASE_URL
 * pointing at a migrated local Postgres; truncates the tables it touches.
 */
import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../db/client";
import { resetAgenda as reset } from "./helpers";
import { loadAvailability } from "../../lib/agenda/availability";
import { createBooking, setBookingStatus } from "../../lib/agenda/bookings";
import {
  activateCampaign,
  closeCampaign,
  countPromoUsed,
  createCampaign,
  generateCampaignCode,
  quote,
  viewOf,
} from "../../lib/campaigns";
import { saveInterest } from "../../lib/interests";



const db = getDb();


const PEOPLE = ["573001110001", "573001110002", "573001110003"];

async function campaignWith(people: string[], opts: Partial<Parameters<typeof createCampaign>[0]> = {}) {
  const res = await createCampaign({
    name: "Encuentro de prueba",
    priceCop: 98900,
    threshold: 3,
    capacity: 3,
    allowsGift: false,
    conditions: "Una sesión por persona.",
    ...opts,
  });
  assert.ok(res.ok);
  for (const contact of people) {
    const saved = await saveInterest({
      kind: "campaign",
      serviceId: "yo-01",
      campaignId: res.campaign.id,
      preferredName: "Persona",
      contactChannel: "whatsapp",
      contactValue: contact,
      consent: true,
    });
    assert.ok(saved.ok);
  }
  return res.campaign;
}

const booking = (startsAt: string, contact: string, campaignCode: string | null) => ({
  serviceId: "yo-01",
  startsAt,
  customerName: "Ana",
  contactChannel: "whatsapp" as const,
  contactValue: contact,
  clientTimeZone: "America/Bogota",
  origin: null,
  campaignCode,
});

describe("campaign codes and views", () => {
  it("generates unguessable codes from the safe alphabet", () => {
    const code = generateCampaignCode();
    assert.match(code, /^E-[A-Z2-9]{8}$/);
    assert.notEqual(code, generateCampaignCode());
  });

  it("derives expired and sold out from the row instead of storing them", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const base = {
      status: "active" as const,
      capacity: 3,
      closesAt: new Date("2026-10-03T12:00:00Z"),
    } as Parameters<typeof viewOf>[0];
    assert.equal(viewOf(base, 0, now), "active");
    assert.equal(viewOf(base, 3, now), "sold_out");
    assert.equal(viewOf({ ...base, closesAt: new Date("2026-10-01T11:00:00Z") }, 0, now), "expired");
    assert.equal(viewOf({ ...base, status: "interest" }, 0, now), "interest");
    assert.equal(viewOf({ ...base, status: "closed" }, 0, now), "closed");
  });
});

describe("activation", () => {
  beforeEach(reset);
  after(reset);

  it("refuses below the threshold unless forced, then opens a 48-hour window", async () => {
    const c = await campaignWith(PEOPLE.slice(0, 2));
    assert.deepEqual(await activateCampaign(c.id), { ok: false, error: "below_threshold" });
    const now = new Date("2026-10-01T23:00:00Z");
    const forced = await activateCampaign(c.id, { force: true }, now);
    assert.ok(forced.ok);
    assert.equal(forced.campaign.status, "active");
    assert.equal(forced.campaign.opensAt?.toISOString(), now.toISOString());
    assert.equal(forced.campaign.closesAt?.toISOString(), "2026-10-03T23:00:00.000Z");
    assert.deepEqual(await activateCampaign(c.id, {}, now), { ok: false, error: "not_activable" });
  });

  it("counts distinct people, not repeated forms from one person", async () => {
    const c = await campaignWith([PEOPLE[0], PEOPLE[0], PEOPLE[0]]);
    assert.deepEqual(await activateCampaign(c.id), { ok: false, error: "below_threshold" });
    const full = await campaignWith(PEOPLE);
    assert.ok((await activateCampaign(full.id)).ok);
  });

  it("rejects a closing instant in the past", async () => {
    const c = await campaignWith(PEOPLE);
    const now = new Date("2026-10-01T12:00:00Z");
    assert.deepEqual(
      await activateCampaign(c.id, { closesAt: new Date("2026-10-01T11:00:00Z") }, now),
      { ok: false, error: "bad_window" },
    );
  });
});

describe("campaign price on bookings", () => {
  beforeEach(reset);
  after(reset);

  it("applies the price only to an active campaign and a registered contact, and freezes it on the order", async () => {
    const c = await campaignWith(PEOPLE);
    const slots = await loadAvailability();

    // Before activation nobody pays the campaign price.
    const early = await createBooking(booking(slots[0].startsAt, PEOPLE[0], c.code));
    assert.deepEqual(early, { ok: false, error: "campaign_unavailable" });

    assert.ok((await activateCampaign(c.id)).ok);
    const stranger = await createBooking(booking(slots[0].startsAt, "573009990000", c.code));
    assert.deepEqual(stranger, { ok: false, error: "campaign_not_eligible" });

    const ok = await createBooking(booking(slots[0].startsAt, PEOPLE[0], c.code));
    assert.ok(ok.ok);
    assert.equal(ok.booking.priceCop, 98900);
    assert.equal(ok.booking.campaignId, c.id);
    assert.equal(ok.booking.origin, null);

    // Changing the campaign afterwards never rewrites the order.
    await db.update(schema.campaigns).set({ priceCop: 120000 }).where(eq(schema.campaigns.id, c.id));
    const [stored] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, ok.booking.id));
    assert.equal(stored.priceCop, 98900);

    // The same person without the link pays the general price, explicitly.
    const general = await createBooking(booking(slots[1].startsAt, PEOPLE[0], null));
    assert.ok(general.ok);
    assert.equal(general.booking.priceCop, 149900);
  });

  it("promo cupos: a pending order holds one, an expired hold or a cancellation frees it", async () => {
    const c = await campaignWith(PEOPLE, { capacity: 1 });
    assert.ok((await activateCampaign(c.id)).ok);
    const slots = await loadAvailability();
    const now = new Date();

    const first = await createBooking(booking(slots[0].startsAt, PEOPLE[0], c.code), now);
    assert.ok(first.ok);
    assert.equal(await countPromoUsed(c.id, now), 1);
    assert.equal((await quote(c.code, PEOPLE[1], now)).state, "sold_out");
    const second = await createBooking(booking(slots[1].startsAt, PEOPLE[1], c.code), now);
    assert.deepEqual(second, { ok: false, error: "campaign_sold_out" });

    // Cancelling the pending order frees the cupo for the next person.
    assert.ok((await setBookingStatus(first.booking.id, "cancelled")).ok);
    assert.equal(await countPromoUsed(c.id, now), 0);
    const third = await createBooking(booking(slots[1].startsAt, PEOPLE[1], c.code), now);
    assert.ok(third.ok);

    // An expired hold does not count either.
    const later = new Date(now.getTime() + 48 * 3600 * 1000 - 60_000);
    assert.equal(await countPromoUsed(c.id, later), 0);
  });

  it("an expired window and a closed campaign refuse the price with a clear error", async () => {
    const c = await campaignWith(PEOPLE);
    const activatedAt = new Date("2026-10-01T12:00:00Z");
    assert.ok((await activateCampaign(c.id, {}, activatedAt)).ok);
    const late = new Date("2026-10-04T12:00:00Z");
    const slots = await loadAvailability(late);
    assert.equal((await quote(c.code, PEOPLE[0], late)).state, "expired");
    const res = await createBooking(booking(slots[0].startsAt, PEOPLE[0], c.code), late);
    assert.deepEqual(res, { ok: false, error: "campaign_unavailable" });

    await closeCampaign(c.id);
    assert.equal((await quote(c.code, PEOPLE[0])).state, "closed");
    assert.equal((await quote("E-NOPE1234", PEOPLE[0])).state, "not_found");
    assert.equal((await quote("garbage", PEOPLE[0])).state, "not_found");
  });
});
