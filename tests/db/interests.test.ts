/**
 * Interest capture (plan sections 8, 10 and 13). Needs DATABASE_URL pointing
 * at a migrated local Postgres; truncates the interests table.
 */
import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { resetAgenda as reset } from "./helpers";
import { displayContact, isValidContact, normalizeContact } from "../../lib/contact";
import { interestKindFor, listInterests, saveInterest, setInterestStatus } from "../../lib/interests";





describe("contact normalization", () => {
  it("treats the same phone written three ways as one contact", () => {
    const a = normalizeContact("whatsapp", "+57 300 123 4567");
    const b = normalizeContact("whatsapp", "0057 (300) 123-4567");
    const c = normalizeContact("whatsapp", "573001234567");
    assert.equal(a, "573001234567");
    assert.equal(a, b);
    assert.equal(a, c);
    assert.equal(displayContact("whatsapp", a), "+573001234567");
  });

  it("lowercases an email and keeps it otherwise", () => {
    assert.equal(normalizeContact("email", "  Ana@Example.COM "), "ana@example.com");
    assert.equal(displayContact("email", "ana@example.com"), "ana@example.com");
  });

  it("validates the normalized value: international prefix and real digits for a phone", () => {
    assert.ok(isValidContact("email", "ana@example.com"));
    assert.ok(!isValidContact("email", "ana@"));
    assert.ok(isValidContact("whatsapp", "+34 600 00 00 00"));
    assert.ok(isValidContact("whatsapp", "0057 (300) 123-4567"));
    assert.ok(!isValidContact("whatsapp", "123"));
    // Punctuation alone and a local number without a prefix are refused.
    assert.ok(!isValidContact("whatsapp", "......."));
    assert.ok(!isValidContact("whatsapp", "300 123 4567"));
  });
});

describe("interest kinds", () => {
  it("maps services to the kind of interest they accept", () => {
    assert.equal(interestKindFor("yo-02"), "service");
    assert.equal(interestKindFor("nos-04"), "service");
    assert.equal(interestKindFor("emp-01"), "company");
    // The active service only accepts the gift inquiry.
    assert.equal(interestKindFor("yo-01"), "gift");
    assert.equal(interestKindFor("reg-01"), null);
    assert.equal(interestKindFor(""), null);
  });
});

describe("saveInterest", () => {
  beforeEach(reset);
  after(reset);

  const base = {
    preferredName: "Ana",
    contactChannel: "whatsapp" as const,
    contactValue: "573001234567",
    consent: true,
  };

  it("stores one row and updates it when the same person sends the form again", async () => {
    const first = await saveInterest({ ...base, kind: "service", serviceId: "yo-02" }, new Date("2026-09-23T15:00:00Z"));
    assert.ok(first.ok && !first.repeated);
    const again = await saveInterest(
      { ...base, kind: "service", serviceId: "yo-02", preferredName: "Ana María" },
      new Date("2026-09-23T16:00:00Z"),
    );
    assert.ok(again.ok && again.repeated);
    assert.equal(again.interest.id, first.interest.id);
    assert.equal(again.interest.preferredName, "Ana", "the first name is kept");
    const rows = await listInterests("service");
    assert.equal(rows.length, 1);
  });

  it("keeps one row per service: the same person can want two future services", async () => {
    assert.ok((await saveInterest({ ...base, kind: "service", serviceId: "yo-02" })).ok);
    assert.ok((await saveInterest({ ...base, kind: "service", serviceId: "yo-03" })).ok);
    assert.equal((await listInterests("service")).length, 2);
  });

  it("rejects a kind the service does not accept, and a missing consent", async () => {
    assert.deepEqual(await saveInterest({ ...base, kind: "service", serviceId: "yo-01" }), { ok: false, error: "invalid_service" });
    assert.deepEqual(await saveInterest({ ...base, kind: "gift", serviceId: "yo-02" }), { ok: false, error: "invalid_service" });
    assert.deepEqual(await saveInterest({ ...base, kind: "company", serviceId: "emp-01", consent: false }), { ok: false, error: "no_consent" });
  });

  it("a gift inquiry keeps the buyer's message and nothing about the beneficiary", async () => {
    const res = await saveInterest({ ...base, kind: "gift", serviceId: "yo-01", message: "Para mi hermana" });
    assert.ok(res.ok);
    assert.equal(res.interest.message, "Para mi hermana");
    assert.equal(res.interest.organization, null);
    assert.equal((await listInterests("gift")).length, 1);
  });

  it("contacted and closed leave the open list; a new form after closing opens a new row", async () => {
    const res = await saveInterest({ ...base, kind: "company", serviceId: "emp-01", organization: "Acme", topic: "Equipos" });
    assert.ok(res.ok);
    const contacted = await setInterestStatus(res.interest.id, "contacted");
    assert.ok(contacted.ok && contacted.interest.contactedAt);
    assert.equal((await listInterests("company")).length, 0);
    assert.equal((await listInterests("company", "contacted")).length, 1);
    const again = await saveInterest({ ...base, kind: "company", serviceId: "emp-01", organization: "Acme" });
    assert.ok(again.ok && !again.repeated);
    assert.notEqual(again.interest.id, res.interest.id);
    assert.deepEqual(await setInterestStatus("00000000-0000-0000-0000-000000000000", "closed"), { ok: false, error: "not_found" });
  });
});
