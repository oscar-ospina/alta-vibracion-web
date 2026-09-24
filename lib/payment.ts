/**
 * Payment instructions (plan section 7, decided 2026-09-23): a Bre-B key,
 * never a bank account number on a page. The key comes from configuration
 * so Liliana can change it without a deploy of code; when it is not set,
 * the pages fall back to "Lili te envía los datos por WhatsApp".
 *
 * Server-only: the pages that show it are rendered on the server and hand
 * the value to the client as a prop. It is not a NEXT_PUBLIC_ variable, so it
 * never lands in the static bundle.
 */
export type PaymentInstructions = {
  /** The Bre-B key as Liliana registered it (phone, email, document or alphanumeric). */
  brebKey: string;
  /** Name shown by Bre-B when the payer looks up the key, so the client can check it. */
  holderName: string | null;
};

export function paymentInstructions(): PaymentInstructions | null {
  const brebKey = process.env.PAYMENT_BREB_KEY?.trim();
  if (!brebKey) return null;
  return { brebKey, holderName: process.env.PAYMENT_BREB_HOLDER?.trim() || null };
}
