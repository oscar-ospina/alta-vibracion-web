"use server";

import { hasDatabase } from "@/db/client";
import { createBooking } from "@/lib/agenda/bookings";
import { isValidTimeZone } from "@/lib/agenda/time";
import { contactError, isContactChannel, isValidContact, normalizeContact } from "@/lib/contact";

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
  if (!isContactChannel(contactChannel)) {
    return { status: "error", message: "Elige cómo prefieres que te contactemos." };
  }
  if (!isValidContact(contactChannel, contactValue)) {
    return { status: "error", message: contactError(contactChannel) };
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
    // Stored normalized so a campaign can match it against an interest.
    contactValue: normalizeContact(contactChannel, contactValue),
    clientTimeZone,
    origin,
  });

  if (!result.ok) {
    const messages = {
      slot_taken: "Ese horario se acaba de ocupar. Elige otro, por favor.",
      unavailable: "Ese horario ya no está disponible. Elige otro, por favor.",
      invalid_service: "Elige una sesión válida.",
      too_many: "Ya tienes reservas pendientes de pago con ese contacto. Escríbenos por WhatsApp para completarlas.",
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
