"use server";

import { hasDatabase } from "@/db/client";
import { createBooking } from "@/lib/agenda/bookings";
import { isValidTimeZone } from "@/lib/agenda/time";
import { contactError, isContactChannel, isValidContact, normalizeContact } from "@/lib/contact";
import { type PaymentInstructions, paymentInstructions } from "@/lib/payment";

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
      priceCop: number;
      /** A redeemed gift: confirmed on creation, nothing to pay. */
      gift: boolean;
      /** How to pay, handed over only once the booking exists; null for a gift or without a key. */
      payment: PaymentInstructions | null;
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
  const campaignCode = str(formData, "campaignCode").slice(0, 12).toUpperCase() || null;
  const giftCode = str(formData, "giftCode").slice(0, 12).toUpperCase() || null;

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
    campaignCode,
    giftCode,
  });

  if (!result.ok) {
    const messages = {
      slot_taken: "Ese horario se acaba de ocupar. Elige otro, por favor.",
      unavailable: "Ese horario ya no está disponible. Elige otro, por favor.",
      invalid_service: "Elige una sesión válida.",
      too_many: "Ya tienes reservas pendientes de pago con ese contacto. Escríbenos por WhatsApp para completarlas.",
      campaign_unavailable: "La oferta de ese encuentro ya no está activa. No reservamos con el precio general sin avisarte: vuelve a la agenda sin el enlace del encuentro si quieres el precio general.",
      campaign_not_eligible: "Ese contacto no aparece registrado en el encuentro. Usa el mismo WhatsApp o correo con el que te registraste, o escríbenos.",
      campaign_sold_out: "Los cupos de esta oferta se acaban de agotar. Escríbenos para consultar disponibilidad general.",
      gift_unavailable: "Este bono de regalo no está disponible para reservar. Pide a quien te lo regaló que confirme con Liliana.",
      gift_used: "Este bono ya fue canjeado. Si crees que hay un error, escríbenos.",
      paused: "Las reservas están en pausa por ahora. Escríbenos por WhatsApp si quieres una fecha.",
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
    priceCop: b.priceCop,
    gift: Boolean(b.giftOrderId),
    payment: b.giftOrderId ? null : paymentInstructions(),
  };
}
