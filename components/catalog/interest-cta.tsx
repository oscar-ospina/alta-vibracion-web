import { MessageCircle } from "lucide-react";
import { BookingButton } from "@/components/brand/booking-button";
import type { Service } from "@/lib/catalog";

/**
 * "Avísame cuando esté disponible" for a service in preparation (plan
 * section 8, "Tarjeta futura"). Until the interest form and its table ship,
 * the CTA opens WhatsApp with the service named, so the interest still reaches
 * Liliana and nothing simulates a saved registration. No price, no calendar.
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
  return (
    <BookingButton
      source="interest"
      size={size}
      className={className}
      message={`Hola, me interesa «${service.name}». ¿Me avisan cuando esté disponible?`}
      eventProps={{ service: service.id }}
      aria-label={`${service.cta}: ${service.name}`}
    >
      <MessageCircle className="size-4" aria-hidden />
      {service.cta}
    </BookingButton>
  );
}
