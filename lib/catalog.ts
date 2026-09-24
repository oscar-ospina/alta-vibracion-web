/**
 * Service catalog. Source of truth: the October plan (section 3, "Catálogo y
 * nombres propuestos") and its decisions (section 1). Names and prices of the
 * future lines are editorial proposals; only YO-01 sells.
 *
 * The status decides what the site may do with a service (plan section 9):
 * - `active`: bookable, price and duration are set. The type forces both.
 * - `paused`: shown with its price but booking is off (Liliana pauses the offer).
 * - `expectation`: shown as "En preparación" with an interest CTA. No price,
 *   no calendar, no payment, and `createBooking` rejects it server-side.
 * - `draft`: not rendered anywhere.
 *
 * Giving YO-01 is a modality of the same service (`allowsGift`), not a
 * separate catalog entry (plan sections 1 and 7.1).
 */

export type LineId = "yo" | "nosotros" | "celebremos" | "empresas";

export type ServiceId =
  | "yo-01"
  | "yo-02"
  | "yo-03"
  | "nos-01"
  | "nos-02"
  | "nos-03"
  | "nos-04"
  | "cel-01"
  | "cel-02"
  | "emp-01"
  | "emp-02";

export type ServiceStatus = "draft" | "expectation" | "active" | "paused";

type ServiceBase = {
  id: ServiceId;
  /** Catalog code as printed in the plan, e.g. "YO-01". */
  code: string;
  line: LineId;
  /** URL segment under the line, e.g. /yo/mi-mapa-729. */
  slug: string;
  name: string;
  /** Public descriptor (plan section 3 table). */
  description: string;
  /** CTA label from the plan's table. */
  cta: string;
  /** Position inside its line. */
  order: number;
  /** The first session can be bought for another adult (plan section 7.1). */
  allowsGift: boolean;
};

export type SellableService = ServiceBase & {
  status: "active" | "paused";
  durationMinutes: number;
  /** Price in COP (integer pesos). Catalog changes never rewrite a booking's price. */
  price: number;
  /** What the price includes, one line each. */
  includes: string[];
  /** Short theme tag under the name. */
  tag: string;
};

export type FutureService = ServiceBase & {
  status: "draft" | "expectation";
  durationMinutes: null;
  price: null;
};

export type Service = SellableService | FutureService;

export const SERVICES: Service[] = [
  {
    id: "yo-01",
    code: "YO-01",
    line: "yo",
    slug: "mi-mapa-729",
    name: "Mi Mapa 729",
    tag: "Primera sesión individual",
    status: "active",
    durationMinutes: 75,
    price: 149900,
    description:
      "Tu primer encuentro con la numerología pitagórica: comprende tu mapa y explora una pregunta personal.",
    includes: [
      "Sesión virtual individual de 75 minutos por Google Meet",
      "Historia introductoria de los números 1 al 9 y lectura de tu mapa",
      "Una pregunta central que tú eliges",
      "Resumen personalizado de 1 a 2 páginas en dos días hábiles",
    ],
    cta: "Elegir horario",
    order: 1,
    allowsGift: true,
  },
  {
    id: "yo-02",
    code: "YO-02",
    line: "yo",
    slug: "mi-camino-729",
    name: "Mi Camino 729",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Una próxima experiencia para explorar ciclos, pináculos y etapas de vida desde una mirada numerológica.",
    cta: "Avísame cuando esté disponible",
    order: 2,
    allowsGift: false,
  },
  {
    id: "yo-03",
    code: "YO-03",
    line: "yo",
    slug: "mi-huella-729",
    name: "Mi Huella 729",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Una nueva lectura simbólica desde la numerología egipcia, actualmente en formación y diseño.",
    cta: "Quiero recibir novedades",
    order: 3,
    allowsGift: false,
  },
  {
    id: "nos-01",
    code: "NOS-01",
    line: "nosotros",
    slug: "nuestro-mapa",
    name: "Nuestro Mapa 729",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Una experiencia en preparación para explorar afinidades y diferencias en pareja mediante mapas numerológicos y conversación.",
    cta: "Me interesa",
    order: 1,
    allowsGift: false,
  },
  {
    id: "nos-02",
    code: "NOS-02",
    line: "nosotros",
    slug: "nuestra-forma-de-amar",
    name: "Nuestra Forma de Amar",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Un próximo espacio para conversar sobre cómo expresamos afecto, qué necesitamos y qué acuerdos queremos construir.",
    cta: "Me interesa",
    order: 2,
    allowsGift: false,
  },
  {
    id: "nos-03",
    code: "NOS-03",
    line: "nosotros",
    slug: "raices-y-alas",
    name: "Raíces y Alas 729",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Un espacio en preparación para madres y padres que desean comprender y cuidar el vínculo con sus hijos, escuchar sus intereses y acompañar su autonomía.",
    cta: "Me interesa",
    order: 3,
    allowsGift: false,
  },
  {
    id: "nos-04",
    code: "NOS-04",
    line: "nosotros",
    slug: "match",
    name: "Alta Vibración Match",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description: "Tecnología para filtrar. Personas para comprender. Experiencias para conocer.",
    cta: "Quiero conocer el proyecto",
    order: 4,
    allowsGift: false,
  },
  {
    id: "cel-01",
    code: "CEL-01",
    line: "celebremos",
    slug: "momentos-con-sentido",
    name: "Momentos con Sentido",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Ceremonias y homenajes personalizados para dar significado a momentos importantes.",
    cta: "Me interesa",
    order: 1,
    allowsGift: false,
  },
  {
    id: "cel-02",
    code: "CEL-02",
    line: "celebremos",
    slug: "detalles-con-sentido",
    name: "Detalles con Sentido",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Ideas de regalos y gestos personales que expresen lo que quieres transmitir.",
    cta: "Me interesa",
    order: 2,
    allowsGift: false,
  },
  {
    id: "emp-01",
    code: "EMP-01",
    line: "empresas",
    slug: "equipos-con-sentido",
    name: "Equipos con Sentido",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Experiencias de autoconocimiento y conversación para fortalecer conexión y reconocimiento en equipos.",
    cta: "Soy empresa y me interesa",
    order: 1,
    allowsGift: false,
  },
  {
    id: "emp-02",
    code: "EMP-02",
    line: "empresas",
    slug: "reconocer-con-sentido",
    name: "Reconocer con Sentido",
    status: "expectation",
    durationMinutes: null,
    price: null,
    description:
      "Futuras propuestas de reconocimiento y detalles significativos para colaboradores y relaciones comerciales.",
    cta: "Me interesa",
    order: 2,
    allowsGift: false,
  },
];

export type Line = {
  id: LineId;
  path: `/${LineId}`;
  /** Menu label, with the plan's number where it has one. */
  navLabel: string;
  title: string;
  /** Header copy from the plan (section 3, "Copias de cabecera"). */
  intro: string;
  /** Lines whose services have their own detail page. */
  hasDetailPages: boolean;
};

export const LINES: Line[] = [
  {
    id: "yo",
    path: "/yo",
    navLabel: "Yo · 7",
    title: "Yo",
    intro:
      "Conocerte es un camino. Comienza con tu mapa personal y descubre las experiencias que estamos preparando.",
    hasDetailPages: true,
  },
  {
    id: "nosotros",
    path: "/nosotros",
    navLabel: "Nosotros · 2",
    title: "Nosotros",
    intro:
      "Un espacio futuro para Alta Vibración Match, experiencias de pareja y vínculos familiares. Estas propuestas aún no tienen reserva abierta aquí.",
    hasDetailPages: true,
  },
  {
    id: "celebremos",
    path: "/celebremos",
    navLabel: "Celebremos · 9",
    title: "Celebremos",
    intro:
      "Estamos preparando experiencias para celebrar, agradecer y dar significado a tus momentos importantes.",
    hasDetailPages: false,
  },
  {
    id: "empresas",
    path: "/empresas",
    navLabel: "Empresas",
    title: "Empresas",
    intro:
      "Estamos diseñando espacios de conexión y reconocimiento para equipos. Cuéntanos qué te gustaría explorar.",
    hasDetailPages: false,
  },
];

export function findLine(id: string | null | undefined): Line | undefined {
  return LINES.find((l) => l.id === id);
}

export function findService(id: string | null | undefined): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function findServiceBySlug(line: LineId, slug: string): Service | undefined {
  return SERVICES.find((s) => s.line === line && s.slug === slug && s.status !== "draft");
}

/** Services shown on a line page, in the plan's order. Drafts never render. */
export function servicesOf(line: LineId): Service[] {
  return SERVICES.filter((s) => s.line === line && s.status !== "draft").sort(
    (a, b) => a.order - b.order,
  );
}

export function isSellable(s: Service | undefined): s is SellableService {
  return s?.status === "active" || s?.status === "paused";
}

/** The only services the agenda may sell. Validated again in `createBooking`. */
export const ACTIVE_SERVICES = SERVICES.filter(
  (s): s is SellableService => s.status === "active",
);

/** The first session, the one product of October. */
export const FIRST_SESSION = ACTIVE_SERVICES.find((s) => s.id === "yo-01")!;

export function servicePath(s: Service): string {
  return `/${s.line}/${s.slug}`;
}

/** Visible next to every price (plan, section 3). */
export const NUMEROLOGY_DISCLAIMER =
  "La numerología se utiliza como herramienta simbólica de reflexión. No diagnostica ni garantiza resultados o predicciones.";

/** Shown under every future service after the plan's copy (section 8). */
export const EXPECTATION_NOTE =
  "Este registro no es una reserva ni implica pago. Sin fecha de lanzamiento todavía.";

/** Format a COP price the Colombian way, e.g. 149900 → "COP 149.900". */
export function formatCOP(price: number): string {
  return `COP ${price.toLocaleString("es-CO")}`;
}
