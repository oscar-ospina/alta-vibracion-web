"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { track } from "@vercel/analytics";
import { Button, Input, Label, cn } from "@saas/ui";
import { type InterestFormState, submitInterest } from "@/app/interests/actions";
import { EXPECTATION_NOTE, type Service } from "@/lib/catalog";
import { whatsappUrl } from "@/lib/site";

const FOCUS_RING =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring";

export type InterestVariant = "service" | "company" | "gift";

const THANKS: Record<InterestVariant, string> = {
  service: "Gracias. Te avisaremos cuando tengamos una propuesta lista.",
  company: "Gracias. Te escribimos para conversar sobre lo que quieres explorar.",
  gift: "Gracias. Liliana te escribirá para confirmar disponibilidad, forma de entrega y condiciones antes de cualquier pago.",
};

const CONSENT: Record<InterestVariant, string> = {
  service: "Autorizo que me avisen por este canal cuando esta propuesta esté disponible.",
  company: "Autorizo que me contacten por este canal para conversar sobre esta propuesta.",
  gift: "Autorizo que me contacten por este canal para atender esta consulta.",
};

/**
 * The one interest form (plan section 8, "Datos mínimos de interés"):
 * preferred name, one channel, the service and the authorization for that
 * one notice. Companies add organization and topic; the gift adds an
 * optional message and never asks about the beneficiary. Shows the plan's
 * thanks only after the server saved the row; a failure offers WhatsApp.
 */
export function InterestForm({
  service,
  variant,
  onSaved,
}: {
  service: Service;
  variant: InterestVariant;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState<InterestFormState, FormData>(
    submitInterest,
    { status: "idle" },
  );
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const uid = useId();

  useEffect(() => {
    if (state.status === "saved") {
      track("interest_submitted", { kind: state.kind, service: state.serviceId });
      onSaved?.();
    }
  }, [state, onSaved]);

  if (state.status === "saved") {
    return (
      <div role="status" data-testid="interest-saved" className="rounded-xl bg-orange-50 p-4 text-sm">
        <p className="font-semibold text-brand-ink">{THANKS[variant]}</p>
        <p className="mt-1 text-muted-foreground">{EXPECTATION_NOTE}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" data-testid="interest-form">
      <input type="hidden" name="serviceId" value={service.id} />

      <div>
        <Label htmlFor={`${uid}-name`}>Tu nombre</Label>
        <Input
          id={`${uid}-name`}
          name="preferredName"
          placeholder="¿Cómo te llamas?"
          autoComplete="name"
          maxLength={80}
          required
          className="mt-2"
        />
      </div>

      {variant === "company" && (
        <>
          <div>
            <Label htmlFor={`${uid}-org`}>Organización</Label>
            <Input id={`${uid}-org`} name="organization" autoComplete="organization" maxLength={120} required className="mt-2" />
          </div>
          <div>
            <Label htmlFor={`${uid}-topic`}>Qué te gustaría explorar</Label>
            <Input id={`${uid}-topic`} name="topic" maxLength={300} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">Sin datos de empleados.</p>
          </div>
        </>
      )}

      <div>
        <fieldset>
          <legend className="text-sm font-medium text-foreground">¿Cómo te contactamos?</legend>
          <div className="mt-1 flex gap-4 text-sm">
            {(["whatsapp", "email"] as const).map((c) => (
              <label key={c} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="contactChannel"
                  value={c}
                  checked={channel === c}
                  onChange={() => setChannel(c)}
                  className={cn("accent-orange-700", FOCUS_RING)}
                />
                {c === "whatsapp" ? "WhatsApp" : "Correo"}
              </label>
            ))}
          </div>
        </fieldset>
        <Input
          name="contactValue"
          aria-label={channel === "whatsapp" ? "Tu número de WhatsApp" : "Tu correo"}
          placeholder={channel === "whatsapp" ? "+57 300 000 0000" : "tu@correo.com"}
          type={channel === "email" ? "email" : "tel"}
          autoComplete={channel === "email" ? "email" : "tel"}
          inputMode={channel === "email" ? "email" : "tel"}
          maxLength={120}
          required
          className="mt-2"
        />
      </div>

      {variant === "gift" && (
        <div>
          <Label htmlFor={`${uid}-message`}>Mensaje o dedicatoria (opcional)</Label>
          <textarea
            id={`${uid}-message`}
            name="message"
            maxLength={500}
            rows={3}
            className={cn(
              "mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm",
              FOCUS_RING,
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            No pedimos datos de la otra persona en este paso.
          </p>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="consent" required className={cn("mt-1 accent-orange-700", FOCUS_RING)} />
        <span>{CONSENT[variant]}</span>
      </label>

      {state.status === "error" && (
        <div role="alert" data-testid="interest-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="font-semibold">{state.message}</p>
          {state.fallback && (
            <a
              href={whatsappUrl(`Hola, me interesa «${service.name}».`)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("mt-1 inline-block font-semibold underline underline-offset-2", FOCUS_RING)}
            >
              Escribir por WhatsApp
            </a>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : service.cta}
      </Button>
    </form>
  );
}
