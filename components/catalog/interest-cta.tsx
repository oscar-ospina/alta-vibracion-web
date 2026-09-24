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
        <Button size={size} className={className} aria-label={`${service.cta}: ${service.name}`}>
          <Bell className="size-4" aria-hidden />
          {service.cta}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
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
