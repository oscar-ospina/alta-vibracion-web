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
} as const;

export type AdminNoticeKey = keyof typeof ADMIN_NOTICE;
