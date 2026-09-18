"use server";

import { hasDatabase } from "@/db/client";
import { createBooking } from "@/lib/agenda/bookings";
import { isValidTimeZone } from "@/lib/agenda/time";

export type BookingFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "created";
      code: string;
      startsAt: string;
      serviceId: string;
      customerName: string;
      clientTimeZone: string;
    };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Public POST. Validates everything itself; never trusts the client. */
export async function submitBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  if (!hasDatabase()) {
    return { status: "error", message: "La agenda en línea no está disponible. Escríbenos por WhatsApp." };
  }
  const serviceId = str(formData, "serviceId");
  const startsAt = str(formData, "startsAt");
  const customerName = str(formData, "customerName").slice(0, 80);
  const contactChannel = str(formData, "contactChannel");
  const contactValue = str(formData, "contactValue").slice(0, 120);
  const clientTimeZone = str(formData, "clientTimeZone");
  const origin = str(formData, "origin").slice(0, 40) || null;

  if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
    return { status: "error", message: "Elige una fecha y una hora." };
  }
  if (customerName.length < 2) {
    return { status: "error", message: "Cuéntanos cómo te llamas (mínimo 2 letras)." };
  }
  if (contactChannel !== "whatsapp" && contactChannel !== "email") {
    return { status: "error", message: "Elige cómo prefieres que te contactemos." };
  }
  if (contactChannel === "email" && !EMAIL_RE.test(contactValue)) {
    return { status: "error", message: "Revisa el correo electrónico." };
  }
  if (contactChannel === "whatsapp" && !PHONE_RE.test(contactValue)) {
    return { status: "error", message: "Revisa el número de WhatsApp (con indicativo de país)." };
  }
  if (!isValidTimeZone(clientTimeZone)) {
    return { status: "error", message: "Elige tu zona horaria." };
  }
  if (origin && !/^[a-z0-9-]+$/i.test(origin)) {
    return { status: "error", message: "Origen inválido." };
  }

  const result = await createBooking({
    serviceId,
    startsAt: new Date(startsAt).toISOString(),
    customerName,
    contactChannel,
    contactValue,
    clientTimeZone,
    origin,
  });

  if (!result.ok) {
    const messages = {
      slot_taken: "Ese horario se acaba de ocupar. Elige otro, por favor.",
      unavailable: "Ese horario ya no está disponible. Elige otro, por favor.",
      invalid_service: "Elige una sesión válida.",
    } as const;
    return { status: "error", message: messages[result.error] };
  }

  const b = result.booking;
  return {
    status: "created",
    code: b.code,
    startsAt: b.startsAt.toISOString(),
    serviceId: b.serviceId,
    customerName: b.customerName,
    clientTimeZone: b.clientTimeZone,
  };
}
