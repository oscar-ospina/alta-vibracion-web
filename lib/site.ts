/**
 * Central site config — contact channels + route map for Alta Vibración.
 *
 * Code & routing are in English; user-facing copy is Spanish (es-CO).
 * Contact channels are inlined (public, single-brand site); NEXT_PUBLIC_WHATSAPP_NUMBER
 * can override the number per environment. Reused by the hero FAB (#23) and the
 * contact page (#26).
 */

// wa.me format: digits only, country code first, no '+'/spaces.
// Real AV business line (resolves epic oscar-ospina/saas-planner#16).
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573217413770";

/** Public contact details — single-brand marketing site, safe to inline. */
export const CONTACT = {
  whatsappNumber: WHATSAPP_NUMBER,
  email: "lp.tobon.miranda@gmail.com",
  phone: "+573217413770", // tel: format (with +); same line as WhatsApp
} as const;

/** Default prefilled message for the persistent top-bar / generic booking intent. */
export const BOOKING_MESSAGE =
  "Hola Alta Vibración, quiero agendar una consulta de numerología.";

/** Build a wa.me click-to-chat URL with an optional prefilled message. */
export function whatsappUrl(message: string = BOOKING_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** App route map — English segments; Spanish labels live at the call site. */
export const ROUTES = {
  home: "/",
  contact: "/contact",
  terms: "/terms",
  privacy: "/privacy",
} as const;
