/**
 * Service catalog. Source of truth: the launch plan (section 2, "Catálogo para
 * comenzar"). Prices are launch hypotheses, not validated market prices; change
 * them here only when Liliana confirms.
 *
 * `bookable` decides whether the card sends the visitor into /agenda or to
 * WhatsApp. The gift (REG-01) is not bookable: the recipient books their own
 * session later, and gift conditions are still being defined.
 */
export type ServiceId = "yo-01" | "yo-02" | "reg-01";

export type Consultation = {
  id: ServiceId;
  /** Catalog code as printed in the plan, e.g. "YO-01". */
  code: string;
  name: string;
  /** Short violet theme tag under the name. */
  tag: string;
  durationMinutes: number;
  /** Commercial description (the plan's "Texto para ficha comercial"). */
  description: string;
  /** What the price includes, one line each. */
  includes: string[];
  /** Price in COP (integer pesos). */
  price: number;
  /** false = the CTA goes to WhatsApp instead of the agenda. */
  bookable: boolean;
  /** Shown as a note on the card and enforced by Liliana on WhatsApp. */
  requiresPreviousSession: boolean;
};

export const CONSULTATIONS: Consultation[] = [
  {
    id: "yo-01",
    code: "YO-01",
    name: "Mi Mapa 729",
    tag: "Primera sesión personal",
    durationMinutes: 75,
    description:
      "Una sesión personal de numerología para explorar cómo te reconoces, qué valoras y qué preguntas quieres hacerte en este momento. Conversamos a partir de tu mapa y de una inquietud que traigas.",
    includes: [
      "Formulario previo breve",
      "Sesión virtual individual de 75 minutos",
      "Resumen personalizado de 1 a 2 páginas en dos días hábiles",
      "Tres acciones o preguntas para seguir reflexionando",
    ],
    price: 149900,
    bookable: true,
    requiresPreviousSession: false,
  },
  {
    id: "yo-02",
    code: "YO-02",
    name: "Mi siguiente paso 729",
    tag: "Continuidad",
    durationMinutes: 60,
    description:
      "Un espacio para trabajar una pregunta concreta que surgió después de tu primera consulta. Elegimos un tema, lo exploramos en una sesión de 60 minutos y acordamos una práctica. Dos semanas después tendrás una revisión breve por escrito.",
    includes: [
      "Formulario de elección de tema",
      "Sesión virtual de 60 minutos",
      "Una práctica personalizada y una hoja de síntesis en dos días hábiles",
      "Revisión escrita al día 14",
    ],
    price: 179900,
    bookable: true,
    requiresPreviousSession: true,
  },
  {
    id: "reg-01",
    code: "REG-01",
    name: "Regala Mi Mapa 729",
    tag: "Regalo para un adulto",
    durationMinutes: 75,
    description:
      "Regala un espacio para conocerse. Incluye una sesión virtual individual de 75 minutos, un resumen personalizado y tres preguntas o acciones de reflexión. La persona elige cuándo reservar y qué desea explorar.",
    includes: [
      "Tarjeta digital con código único y tu mensaje",
      "La persona que recibe el regalo elige su horario",
      "Lo conversado queda entre ella y Liliana",
    ],
    price: 149900,
    bookable: false,
    requiresPreviousSession: false,
  },
];

export const BOOKABLE_CONSULTATIONS = CONSULTATIONS.filter((c) => c.bookable);

export function findConsultation(id: string | null | undefined) {
  return CONSULTATIONS.find((c) => c.id === id);
}

/** Visible next to every price (plan, section 2). */
export const NUMEROLOGY_DISCLAIMER =
  "La numerología se utiliza como herramienta simbólica de reflexión. No diagnostica ni garantiza resultados o predicciones.";

/** Format a COP price the Colombian way, e.g. 150000 → "COP 150.000". */
export function formatCOP(price: number): string {
  return `COP ${price.toLocaleString("es-CO")}`;
}
