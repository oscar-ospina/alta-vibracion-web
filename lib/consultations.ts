/**
 * Consultations catalog (story oscar-ospina/saas-planner#25). Static config so the
 * grid reflects new citas/prices/modality by editing this data only — no component
 * changes (CMS deferred; the typed array is a drop-in seam for a future fetcher).
 * Source of truth mirrors the kit's `CITAS` (components.jsx).
 */
export type Consultation = {
  id: number;
  /** Display name, e.g. "Numerología Esencial". */
  name: string;
  /** Short violet theme tag, e.g. "Autoconocimiento y Destino". */
  tag: string;
  /** Modality badge label, e.g. "Presencial / Virtual" (per-cita, data-driven). */
  modality: string;
  description: string;
  /** Price in COP (integer pesos). */
  price: number;
};

export const CONSULTATIONS: Consultation[] = [
  {
    id: 1,
    name: "Numerología Esencial",
    tag: "Autoconocimiento y Destino",
    modality: "Presencial / Virtual",
    description:
      "Descubre lo que tu nombre completo revela sobre tu misión personal. Conecta con tus anhelos más profundos.",
    price: 150000,
  },
  {
    id: 2,
    name: "Numerología Avanzada",
    tag: "Caminos y Tránsitos del Alma",
    modality: "Presencial / Virtual",
    description:
      "Descubre las habilidades únicas que trajiste al nacer. Conoce los eventos importantes que marcarán tu vida.",
    price: 161900,
  },
  {
    id: 3,
    name: "Numerología Profunda",
    tag: "Caminos de Evolución y Desafíos",
    modality: "Presencial / Virtual",
    description:
      "Revelación detallada de las experiencias clave que marcan tu vida y las influencias de tu camino vital.",
    price: 189000,
  },
  {
    id: 4,
    name: "Numerología Especializada",
    tag: "Áreas Específicas de Vida",
    modality: "Presencial / Virtual",
    description:
      "Análisis profundo enfocado: relaciones de pareja, familia, orientación profesional y más.",
    price: 210000,
  },
];

/** Format a COP price the Colombian way, e.g. 150000 → "COP 150.000". */
export function formatCOP(price: number): string {
  return `COP ${price.toLocaleString("es-CO")}`;
}
