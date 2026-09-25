"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { Bell } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@saas/ui";
import { InterestForm } from "@/components/catalog/interest-form";
import type { Service } from "@/lib/catalog";

/**
 * "Avísame cuando esté disponible" for a service in preparation (plan
 * section 8, "Tarjeta futura"). Opens the interest form in a dialog; the
 * form itself talks to the server. Companies get the organization fields.
 *
 * Labels like "Avísame cuando esté disponible" outgrow a narrow card or a phone,
 * so the button wraps, centered, and the bell and the label share one inline
 * box: when the label breaks, the icon stays beside the first word instead of
 * sitting alone at the padding edge. `text-balance` keeps the two lines even.
 * The keyboard focus ring comes from the unlayered `[data-slot="dialog-trigger"]`
 * rule in app/brand.css (Radix's DialogTrigger replaces the Button's data-slot).
 */
export function InterestCta({
  service,
  size = "sm",
  className,
}: {
  service: Service;
  size?: "sm" | "lg" | "default";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const variant = service.line === "empresas" ? "company" : "service";
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Opens versus submits: the funnel of the "Avísame" dialog.
        if (next) track("open_interest", { service: service.id });
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size={size}
          className={`whitespace-normal text-center ${className ?? ""}`}
          aria-label={`${service.cta}: ${service.name}`}
        >
          <span className="text-balance">
            <Bell className="mr-1 inline-block size-4 align-[-2px]" aria-hidden />
            {service.cta}
          </span>
        </Button>
      </DialogTrigger>
      {/* The form's submit button (components/catalog/interest-form.tsx, frozen by an
          open PR) keeps the DS nowrap, so at 350px "Avísame cuando esté disponible"
          scrolled the dialog sideways. Scoped override until that file wraps it. */}
      <DialogContent className="max-h-[90dvh] overflow-y-auto [&_button[type=submit]]:whitespace-normal [&_button[type=submit]]:text-center">
        <DialogHeader>
          <DialogTitle>{service.name}</DialogTitle>
          <DialogDescription>
            En preparación. Déjanos un canal y te avisamos cuando esté lista. No es una
            reserva ni implica pago.
          </DialogDescription>
        </DialogHeader>
        <InterestForm service={service} variant={variant} />
      </DialogContent>
    </Dialog>
  );
}
