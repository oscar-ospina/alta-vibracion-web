/**
 * Gift orders and voucher redemption (plan sections 7.1 and 13). Needs
 * DATABASE_URL pointing at a migrated local Postgres.
 */
import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../../db/client";
import { resetAgenda as reset } from "./helpers";
import { loadAvailability } from "../../lib/agenda/availability";
import { createBooking, createManualBooking, setBookingStatus } from "../../lib/agenda/bookings";
import { activateCampaign, countPromoUsed, createCampaign } from "../../lib/campaigns";
import {
  createGiftFromInterest,
  createGiftOrder,
  generateGiftCode,
  giftCapacity,
  listGiftsToSchedule,
  redeemableGift,
  setGiftStatus,
} from "../../lib/gifts";
import { saveInterest } from "../../lib/interests";

const db = getDb();

const buyer = {
  buyerName: "Carlos",
  buyerContactChannel: "whatsapp" as const,
  buyerContactValue: "573001110001",
  conditions: "Vigencia 90 días.",
};

const beneficiary = (startsAt: string, giftCode: string | null, contact = "573009990009") => ({
  serviceId: "yo-01",
  startsAt,
  customerName: "Beneficiaria",
  contactChannel: "whatsapp" as const,
  contactValue: contact,
  clientTimeZone: "America/Bogota",
  origin: null,
  giftCode,
});

describe("gift orders", () => {
  beforeEach(reset);
  after(reset);

  it("generates unguessable voucher codes", () => {
    assert.match(generateGiftCode(), /^RG-[A-Z2-9]{8}$/);
  });

  it("records the sale once and moves through pending → paid; a redeemed order cannot be cancelled", async () => {
    const created = await createGiftOrder({ ...buyer, priceCop: 149900, message: "Para ti", paid: false });
    assert.ok(created.ok);
    assert.equal(created.order.status, "pending_payment");
    assert.equal((await redeemableGift(created.order.code)).state, "pending");

    const paid = await setGiftStatus(created.order.id, "paid");
    assert.ok(paid.ok && paid.order.paidAt);
    assert.equal((await redeemableGift(created.order.code)).state, "ready");
    assert.equal((await listGiftsToSchedule()).length, 1);

    const [slot] = await loadAvailability();
    const booking = await createBooking(beneficiary(slot.startsAt, created.order.code));
    assert.ok(booking.ok);
    assert.equal(booking.booking.status, "confirmed", "a paid gift is confirmed on creation");
    assert.equal(booking.booking.priceCop, 0, "the redemption is not a sale");
    assert.equal(booking.booking.giftOrderId, created.order.id);
    assert.equal((await redeemableGift(created.order.code)).state, "redeemed");
    assert.equal((await listGiftsToSchedule()).length, 0);
    assert.deepEqual(await setGiftStatus(created.order.id, "cancelled"), { ok: false, error: "bad_transition" });
  });

  it("a voucher is redeemed once, and only while paid", async () => {
    const created = await createGiftOrder({ ...buyer, priceCop: 149900, paid: true });
    assert.ok(created.ok);
    const [a, b] = await loadAvailability();
    const first = await createBooking(beneficiary(a.startsAt, created.order.code));
    assert.ok(first.ok);
    const again = await createBooking(beneficiary(b.startsAt, created.order.code, "573009990010"));
    assert.deepEqual(again, { ok: false, error: "gift_used" });
    const manual = await createManualBooking({
      customerName: "Otra",
      contactChannel: "whatsapp",
      contactValue: "573009990011",
      date: b.date,
      time: b.time,
      priceCop: 0,
      paid: false,
      giftCode: created.order.code,
    });
    assert.deepEqual(manual, { ok: false, error: "gift_used" });

    const pending = await createGiftOrder({ ...buyer, priceCop: 149900, paid: false });
    assert.ok(pending.ok);
    assert.deepEqual(await createBooking(beneficiary(b.startsAt, pending.order.code)), { ok: false, error: "gift_unavailable" });
    assert.deepEqual(await createBooking(beneficiary(b.startsAt, "RG-NOPE1234")), { ok: false, error: "gift_unavailable" });
  });

  it("a cancelled redemption booking frees the voucher for a manual re-booking only through the admin", async () => {
    const created = await createGiftOrder({ ...buyer, priceCop: 149900, paid: true });
    assert.ok(created.ok);
    const [slot, other] = await loadAvailability();
    const first = await createBooking(beneficiary(slot.startsAt, created.order.code));
    assert.ok(first.ok);
    assert.ok((await setBookingStatus(first.booking.id, "cancelled")).ok);
    // The order stays redeemed (the money moved once); Liliana re-books by hand without the code.
    assert.equal((await redeemableGift(created.order.code)).state, "redeemed");
    const rebooked = await createManualBooking({
      customerName: "Beneficiaria",
      contactChannel: "whatsapp",
      contactValue: "573009990009",
      date: other.date,
      time: other.time,
      priceCop: 0,
      paid: true,
      note: `regalo-${created.order.code}`,
    });
    assert.ok(rebooked.ok);
  });

  it("starts an order from an inquiry with the buyer's data and marks the inquiry contacted", async () => {
    const interest = await saveInterest({
      kind: "gift",
      serviceId: "yo-01",
      preferredName: "Ana",
      contactChannel: "email",
      contactValue: "ana@example.com",
      message: "Para mi hermana",
      consent: true,
    });
    assert.ok(interest.ok);
    const res = await createGiftFromInterest(interest.interest.id);
    assert.ok(res.ok);
    assert.equal(res.order.buyerName, "Ana");
    assert.equal(res.order.buyerContactValue, "ana@example.com");
    assert.equal(res.order.message, "Para mi hermana");
    assert.equal(res.order.priceCop, 149900);
    assert.equal(res.order.status, "pending_payment");
    const [row] = await db.select().from(schema.interests).where(eq(schema.interests.id, interest.interest.id));
    assert.equal(row.status, "contacted");
    assert.deepEqual(await createGiftFromInterest("00000000-0000-0000-0000-000000000000"), { ok: false, error: "not_found" });
  });

  it("warns when paid vouchers outnumber the free slots, and a manual booking with the code redeems it", async () => {
    const now = new Date();
    const free = (await loadAvailability(now)).length;
    for (let i = 0; i < free + 1; i++) {
      assert.ok((await createGiftOrder({ ...buyer, buyerContactValue: `5730011100${i}`, priceCop: 149900, paid: true })).ok);
    }
    const before = await giftCapacity(now);
    assert.equal(before.unscheduled, free + 1);
    assert.ok(before.short);

    const [order] = await listGiftsToSchedule();
    const [slot] = await loadAvailability(now);
    const manual = await createManualBooking({
      customerName: "Beneficiario",
      contactChannel: "whatsapp",
      contactValue: "573009990012",
      date: slot.date,
      time: slot.time,
      priceCop: 149900,
      paid: false,
      giftCode: order.code,
    }, now);
    assert.ok(manual.ok);
    assert.equal(manual.booking.status, "confirmed");
    assert.equal(manual.booking.priceCop, 0);
    assert.equal(manual.booking.giftOrderId, order.id);
    const after = await giftCapacity(now);
    assert.equal(after.unscheduled, free);
  });

  it("a gift at a campaign price consumes a promo cupo, and only when the campaign allows gifts", async () => {
    const noGifts = await createCampaign({ name: "Sin regalos", priceCop: 98900, threshold: 1, capacity: 2, allowsGift: false, conditions: "" });
    assert.ok(noGifts.ok);
    assert.ok((await activateCampaign(noGifts.campaign.id, { force: true })).ok);
    assert.deepEqual(
      await createGiftOrder({ ...buyer, priceCop: 149900, paid: true, campaignId: noGifts.campaign.id }),
      { ok: false, error: "campaign_unavailable" },
    );

    const withGifts = await createCampaign({ name: "Con regalos", priceCop: 98900, threshold: 1, capacity: 1, allowsGift: true, conditions: "" });
    assert.ok(withGifts.ok);
    assert.ok((await activateCampaign(withGifts.campaign.id, { force: true })).ok);
    const gift = await createGiftOrder({ ...buyer, priceCop: 149900, paid: true, campaignId: withGifts.campaign.id });
    assert.ok(gift.ok);
    assert.equal(gift.order.priceCop, 98900, "the campaign price applies");
    assert.equal(await countPromoUsed(withGifts.campaign.id), 1);
    assert.deepEqual(
      await createGiftOrder({ ...buyer, priceCop: 149900, paid: true, campaignId: withGifts.campaign.id }),
      { ok: false, error: "campaign_unavailable" },
      "the last cupo went to the gift",
    );
  });
});
