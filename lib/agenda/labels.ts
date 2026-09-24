import type { BookingStatus } from "@/db/schema";

/** One place for the Spanish wording of every booking state. */
export const STATUS_LABEL: Record<BookingStatus, { label: string; hint: string }> = {
  pending_payment: {
    label: "Pendiente de pago",
    hint: "Tu horario está reservado mientras Liliana verifica el pago. Si aún no le has escrito, envíale tu código por WhatsApp.",
  },
  confirmed: {
    label: "Confirmada",
    hint: "Liliana verificó el pago. Recibirás el enlace de Google Meet y el formulario previo por el canal que elegiste.",
  },
  cancelled: {
    label: "Cancelada",
    hint: "Esta reserva fue cancelada. Si quieres otra fecha, escríbenos.",
  },
  expired: {
    label: "Vencida",
    hint: "El plazo para el pago terminó y el horario volvió a quedar libre. Puedes reservar de nuevo.",
  },
};

/** Stages that only the delivery marks produce (see lib/agenda/delivery.ts). */
export const STAGE_LABEL: Record<"attended" | "delivered", { label: string; hint: string }> = {
  attended: {
    label: "Sesión realizada",
    hint: "Liliana está preparando tu resumen. Lo verás aquí mismo cuando esté aprobado.",
  },
  delivered: {
    label: "Resumen entregado",
    hint: "Tu resumen está listo. Guárdalo; esta página es privada y solo la abre tu código.",
  },
};

export const REPORT_STATUS_LABEL: Record<"draft" | "reviewed" | "approved", string> = {
  draft: "Borrador",
  reviewed: "Revisado",
  approved: "Aprobado",
};

/** Admin notices, keyed so the key travels in the URL and the copy stays here. */
export const ADMIN_NOTICE = {
  not_found: "La reserva no existe.",
  hold_expired:
    "El plazo de pago venció; el horario pudo ser tomado por otra persona. Pide al cliente reservar de nuevo.",
  not_pending: "La reserva ya no está pendiente.",
  slot_taken: "Otra reserva activa ocupa ese horario. No se confirmó.",
  bad_date: "La fecha no es válida.",
  bad_time: "La hora no es válida (formato HH:MM).",
  overlap: "Esa hora extra se solapa con un horario ya existente ese día.",
  saved: "Guardado.",
  not_confirmed: "Solo una reserva confirmada puede marcarse.",
  not_attended: "Marca primero la sesión como realizada.",
  attended: "No se cancela una sesión ya realizada.",
  empty: "Escribe el resumen antes de marcarlo como revisado o aprobado.",
  bad_status: "Estado del informe no válido.",
  interest_not_found: "Ese interés ya no existe.",
  interest_bad_status: "Estado del interés no válido.",
} as const;

export type AdminNoticeKey = keyof typeof ADMIN_NOTICE;

/** The notice for an `?aviso=` value, or null. Own keys only: `__proto__` is not a notice. */
export function adminNotice(aviso: string | undefined): string | null {
  return aviso && Object.hasOwn(ADMIN_NOTICE, aviso) ? ADMIN_NOTICE[aviso as AdminNoticeKey] : null;
}
