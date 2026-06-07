/**
 * Central site config — contact channels + route map for Alta Vibración.
 *
 * Code & routing are in English; user-facing copy is Spanish (es-CO).
 * The WhatsApp business number is an open question (epic oscar-ospina/saas-planner#16):
 * it comes from NEXT_PUBLIC_WHATSAPP_NUMBER in production, with a clearly-marked
 * placeholder for local/dev so the CTA wiring stays testable. Reused by the hero
 * FAB (#23) and the contact page (#26).
 */

// wa.me format: digits only, country code first, no '+'/spaces.
// TODO(saas-planner#16): replace placeholder with the real AV business number.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573000000000";

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
