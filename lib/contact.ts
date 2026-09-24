/**
 * One contact channel per person, validated and normalized the same way for
 * bookings and interests, so a campaign can later match the two (plan
 * section 5: eligibility = the contact registered before activation).
 *
 * Normalization is deliberately dumb: no country code is inferred from
 * anything (plan section 7 forbids inferring by nationality). Digits only
 * for a phone, lowercase for an email.
 */
export type ContactChannel = "whatsapp" | "email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

export function isContactChannel(v: string): v is ContactChannel {
  return v === "whatsapp" || v === "email";
}

/** True when the raw value looks like a valid contact for the channel. */
export function isValidContact(channel: ContactChannel, raw: string): boolean {
  const v = raw.trim();
  return channel === "email" ? EMAIL_RE.test(v) : PHONE_RE.test(v);
}

/** Canonical form stored in the database. Call only after `isValidContact`. */
export function normalizeContact(channel: ContactChannel, raw: string): string {
  const v = raw.trim();
  if (channel === "email") return v.toLowerCase();
  const digits = v.replace(/\D/g, "");
  // "0057300…" and "+57300…" are the same number.
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

/** Readable form for the admin: "+573001234567" for a phone, the email as is. */
export function displayContact(channel: ContactChannel, stored: string): string {
  return channel === "email" ? stored : `+${stored}`;
}
