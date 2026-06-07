import Image from "next/image";
import { Calendar } from "lucide-react";
import { BookingButton } from "@/components/brand/booking-button";

/**
 * Home hero (story oscar-ospina/saas-planner#23): cosmic backdrop + dark scrim,
 * H1 + subhead, and the primary "Agenda tu cita" CTA → WhatsApp. Server component.
 */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-neutral-950">
      {/* Cosmic backdrop — the LCP image; dimmed so text reads over it. */}
      <Image
        src="/hero-bg-home.jpg"
        alt=""
        fill
        priority
        quality={50}
        sizes="100vw"
        className="object-cover opacity-60"
      />
      {/* Contrast scrim. Mobile/tablet: a UNIFORM dark floor (neutral-950 #24242d
          @ 75% → white text ≥6.7:1 even over a pure-white image pixel, and far more
          over the actual dark cosmic photo) — guarantees AA regardless of how wide
          the text wraps. lg+: directional, so the text sits over the dark left while
          the image reveals on the right (text stays in the left half, always ≥ ~80%). */}
      <div className="absolute inset-0 bg-neutral-950/75 lg:hidden" />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-neutral-950/95 via-neutral-950/80 to-neutral-950/30 lg:block" />

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:px-10 lg:py-32">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Conecta con tu esencia a través de los números
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/85">
            Cada número tiene una vibración única que habla de ti. Aprende a
            escucharlos y desbloquea respuestas sobre tu vida, tu alma y tu
            propósito.
          </p>
          <div className="mt-8">
            <BookingButton source="hero" size="lg">
              <Calendar className="size-5" aria-hidden />
              Agenda tu cita
            </BookingButton>
          </div>
        </div>
      </div>
    </section>
  );
}
