"use server";

import { hasDatabase } from "@/db/client";
import { contactError, isContactChannel, isValidContact, normalizeContact } from "@/lib/contact";
import { interestKindFor, saveInterest } from "@/lib/interests";

/**
 * Public interest forms (plan section 8 "Datos mínimos de interés" and 7.1
 * step 1 for the gift). Everything is validated here; the client is not
 * trusted. When the database is missing or the write fails, the result says
 * so and the form offers WhatsApp: nothing ever shows a success it did not
 * save (plan sections 7.1 and 13).
 */
export type InterestFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fallback: boolean }
  | { status: "saved"; kind: "service" | "gift" | "company"; serviceId: string };

const FALLBACK = "No pudimos guardar tu registro. Escríbenos por WhatsApp y lo anotamos a mano.";

function str(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function submitInterest(
  _prev: InterestFormState,
  formData: FormData,
): Promise<InterestFormState> {
  const serviceId = str(formData, "serviceId", 20);
  const kind = interestKindFor(serviceId);
  if (!kind) return { status: "error", message: "Elige una propuesta válida.", fallback: false };

  const preferredName = str(formData, "preferredName", 80);
  const contactChannel = str(formData, "contactChannel", 10);
  const contactRaw = str(formData, "contactValue", 120);
  const consent = formData.get("consent") === "on";
  const organization = str(formData, "organization", 120) || null;
  const topic = str(formData, "topic", 300) || null;
  const message = str(formData, "message", 500) || null;

  if (preferredName.length < 2) {
    return { status: "error", message: "Cuéntanos cómo te llamas (mínimo 2 letras).", fallback: false };
  }
  if (!isContactChannel(contactChannel)) {
    return { status: "error", message: "Elige cómo prefieres que te contactemos.", fallback: false };
  }
  if (!isValidContact(contactChannel, contactRaw)) {
    return { status: "error", message: contactError(contactChannel), fallback: false };
  }
  if (!consent) {
    return { status: "error", message: "Necesitamos tu autorización para avisarte.", fallback: false };
  }
  if (kind === "company" && !organization) {
    return { status: "error", message: "Cuéntanos el nombre de tu organización.", fallback: false };
  }

  if (!hasDatabase()) return { status: "error", message: FALLBACK, fallback: true };

  try {
    const res = await saveInterest({
      kind,
      serviceId,
      preferredName,
      contactChannel,
      contactValue: normalizeContact(contactChannel, contactRaw),
      organization: kind === "company" ? organization : null,
      topic: kind === "company" ? topic : null,
      message: kind === "gift" ? message : null,
      consent,
    });
    if (!res.ok) return { status: "error", message: "No pudimos registrar ese interés.", fallback: false };
    return { status: "saved", kind, serviceId };
  } catch (err) {
    console.error("interests: save failed", err);
    return { status: "error", message: FALLBACK, fallback: true };
  }
}
