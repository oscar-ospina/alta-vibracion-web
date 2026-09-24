/**
 * One contact channel per person, validated and normalized the same way for
 * bookings and interests, so a campaign can later match the two (plan
 * section 5: eligibility = the contact registered before activation).
 *
 * A phone must be typed in international form ("+57 300…" or "0057 300…"):
 * the site never infers a country code (plan section 7 forbids inferring by
 * nationality), so the only honest way to show "+573001234567" back is to
 * have asked for the prefix. Validation runs on the normalized value, never
 * on the raw string, so punctuation alone cannot pass.
 */
export type ContactChannel = "whatsapp" | "email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** E.164 without the plus: country code plus subscriber number, 8 to 15 digits. */
const PHONE_DIGITS_RE = /^[1-9]\d{7,14}$/;
const INTERNATIONAL_PREFIX_RE = /^\s*(\+|00)/;

export function isContactChannel(v: string): v is ContactChannel {
  return v === "whatsapp" || v === "email";
}

/** Canonical form stored in the database: lowercase email, or digits only with the country code. */
export function normalizeContact(channel: ContactChannel, raw: string): string {
  const v = raw.trim();
  if (channel === "email") return v.toLowerCase();
  const digits = v.replace(/\D/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

/** True when the value is a usable contact for the channel. */
export function isValidContact(channel: ContactChannel, raw: string): boolean {
  const normalized = normalizeContact(channel, raw);
  if (channel === "email") return EMAIL_RE.test(normalized) && normalized.length <= 120;
  return INTERNATIONAL_PREFIX_RE.test(raw) && PHONE_DIGITS_RE.test(normalized);
}

/** Error copy for an invalid value, shared by every form. */
export function contactError(channel: ContactChannel): string {
  return channel === "email"
    ? "Revisa el correo electrónico."
    : "Escribe el WhatsApp con indicativo de país, por ejemplo +57 300 000 0000.";
}

/** Readable form for the admin: "+573001234567" for a phone, the email as is. */
export function displayContact(channel: ContactChannel, stored: string): string {
  return channel === "email" ? stored : `+${stored}`;
}
