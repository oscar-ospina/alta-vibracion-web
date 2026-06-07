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
  phone: `+${WHATSAPP_NUMBER}`, // tel: format (with +); same line as WhatsApp
} as const;

/**
 * Human-readable form of the WhatsApp/phone line, DERIVED from the same canonical
 * number as the wa.me/tel hrefs — so the displayed value can never drift from the
 * link if NEXT_PUBLIC_WHATSAPP_NUMBER is overridden. Colombian mobile (57 + 10
 * digits) renders as "+57 321 741 3770"; anything else falls back to "+<digits>".
 */
function formatPhoneDisplay(digits: string): string {
  const m = digits.match(/^57(\d{3})(\d{3})(\d{4})$/);
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}

export const CONTACT_PHONE_DISPLAY = formatPhoneDisplay(WHATSAPP_NUMBER);

/**
 * Public social profiles — rendered in the footer "Síguenos" row (story #36).
 * Only the networks the practice actually maintains (today: Instagram only; the
 * Figma design also shows TikTok — add here when it launches).
 */
export const SOCIAL = {
  instagram: "https://www.instagram.com/lili.altavibracion",
} as const;

/** Default prefilled message for the persistent top-bar / generic booking intent. */
export const BOOKING_MESSAGE =
  "Hola Alta Vibración, quiero agendar una consulta de numerología.";

/** Build a wa.me click-to-chat URL with an optional prefilled message. */
export function whatsappUrl(message: string = BOOKING_MESSAGE): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Canonical production origin — drives metadataBase, OpenGraph, sitemap & robots.
 * Override per environment with NEXT_PUBLIC_SITE_URL (set in Vercel to the real
 * subdomain on resuelv.com). The default is the planned AV subdomain, so OG/sitemap
 * URLs are correct without a code change once the final host is wired.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://altavibracion.resuelv.com";

/** App route map — English segments; Spanish labels live at the call site. */
export const ROUTES = {
  home: "/",
  contact: "/contact",
  terms: "/terms",
  privacy: "/privacy",
} as const;
