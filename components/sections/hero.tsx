import Image from "next/image";
import { Calendar } from "lucide-react";
import { BookingButton } from "@/components/brand/booking-button";

/**
 * Home hero (stories oscar-ospina/saas-planner#23 / #37): cosmic backdrop + dark scrim,
 * the gradient-accented H1, subhead, and the primary "Agenda tu cita" CTA → WhatsApp.
 *
 * Fidelity to Figma (hero section 182:3849): "esencia" carries the design text gradient
 * (`ts1` = linear 270° #f06b06→#fac938); the H1 is Archivo 56px / 108% line-height /
 * −0.45% tracking; the gold botanical line-art (`/hero-decoration.svg`, with its glow
 * baked into the SVG drop-shadow filter) sits on the right at lg+. Server component.
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
      {/* Contrast scrim (story #23). Mobile/tablet: a UNIFORM dark floor (neutral-950
          #24242d @ 75% → white text ≥6.7:1). lg+: directional, so the text sits over
          the dark left while the image + decoration reveal on the right. */}
      <div className="absolute inset-0 bg-neutral-950/75 lg:hidden" />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-neutral-950/95 via-neutral-950/80 to-neutral-950/30 lg:block" />

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:flex lg:items-center lg:px-10 lg:py-32">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.0045em] text-white sm:text-5xl lg:text-[56px]">
            Conecta con tu{" "}
            <span className="text-gradient-brand">esencia</span>{" "}
            a través de los números
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

        {/* Brand line-art decoration (#37): the gold botanical line-art as an IN-FLOW
            right column at lg+ (ml-auto pushes it to the edge) — side-by-side with the
            text exactly like Figma, so it can never sit behind the H1/subhead. (The
            earlier absolute version bled left into the text column at the 1024–1400px
            band, putting gold strokes behind white glyphs.) The warm glow is baked into
            the SVG's own drop-shadow filter. Desktop-only — mobile keeps the uniform
            scrim. Decorative → aria-hidden + pointer-events-none. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-decoration.svg"
          alt=""
          aria-hidden
          className="pointer-events-none ml-auto hidden h-auto w-[36%] max-w-[480px] select-none opacity-95 lg:block"
        />
      </div>
    </section>
  );
}
