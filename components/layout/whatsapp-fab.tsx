import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/site";

/**
 * Floating WhatsApp click-to-chat button (story oscar-ospina/saas-planner#23):
 * fixed bottom-right on every route. The canonical WhatsApp green (#25D366) fill +
 * white glyph are a brand identifier → WCAG 1.4.11 "essential" exception (and the
 * AC mandates #25D366). The green vs the page is only ~1.8:1, so the `ring-black/50`
 * (≈3.9:1 vs the page) supplies the component's 3:1 control boundary. Server component.
 */
export function WhatsappFab() {
  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-6 right-6 z-50 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg ring-1 ring-black/50 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <MessageCircle className="size-7" aria-hidden />
    </a>
  );
}
