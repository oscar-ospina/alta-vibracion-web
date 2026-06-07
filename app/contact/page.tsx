import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Prose } from "@/components/sections/prose";
import { readLegalDoc } from "@/lib/legal";
import { CONTACT, CONTACT_PHONE_DISPLAY, whatsappUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escríbenos por WhatsApp, correo o teléfono para agendar tu consulta de numerología con Liliana Tobón.",
};

// Real contact channels (single-brand site — safe to surface). Both the display
// text and the hrefs derive from lib/site.ts's canonical number, so a per-env
// WhatsApp override propagates to the shown value and the link together.
const CHANNELS = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: CONTACT_PHONE_DISPLAY,
    href: whatsappUrl(),
    external: true,
  },
  {
    icon: Mail,
    label: "Correo electrónico",
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
    external: false,
  },
  {
    icon: Phone,
    label: "Teléfono",
    value: CONTACT_PHONE_DISPLAY,
    href: `tel:${CONTACT.phone}`,
    external: false,
  },
];

export default function ContactPage() {
  const intro = readLegalDoc("contact");
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">Contacto</h1>
      <div className="mt-6">
        <Prose>{intro}</Prose>
      </div>

      <ul className="mt-8 space-y-3">
        {CHANNELS.map(({ icon: Icon, label, value, href, external }) => (
          <li key={label}>
            <a
              href={href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="flex items-center gap-4 rounded-xl border border-neutral-100 bg-card p-4 transition-colors hover:border-violet-200 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
