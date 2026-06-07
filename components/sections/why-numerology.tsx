import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Card } from "@saas/ui";

/**
 * "¿Por qué Numerología?" trust section (stories oscar-ospina/saas-planner#23/#24 → #38):
 * a white Card (Figma `section2` 182:3868) — a bleed cosmic image panel on the left with
 * the two brand line-art faces (`why-asset.svg` + `why-asset2.svg`) layered + warm-glowed
 * over it, and the content (eyebrow chip → H2 → two paragraphs) on the right.
 *
 * Fidelity notes: card #FFFFFF (= bg-card) / radius 32px; body copy #363744 (= text-foreground);
 * the eyebrow uses brand-ink (orange-700, AA on white) rather than the Figma #F0601F, which is
 * only ~3.3:1 on white and fails AA for 18px text (same a11y rule the rest of the app follows).
 * The line-art SVGs are decorative (aria-hidden) and clipped to the panel so they never overflow
 * the card; the warm drop-shadow stands in for the design's glow.
 */
export function WhyNumerology() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
      <Card className="overflow-hidden rounded-[2rem] p-0">
        <div className="grid md:grid-cols-2">
          {/* Cosmic image panel — bleeds to the (rounded, clipped) card edge. The two
              brand line-art faces are layered over it per Figma (asset2 large upper-left,
              asset with the peony center-right), cropped by the panel so nothing spills
              out of the card. Decorative → aria-hidden + pointer-events-none. */}
          <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto">
            <Image
              src="/hero-bg-home.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/why-asset2.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[-18%] top-[-42%] w-[80%] select-none [filter:drop-shadow(0_0_10px_rgba(255,182,0,0.55))]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/why-asset.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[30%] top-[4%] w-[72%] select-none [filter:drop-shadow(0_0_10px_rgba(255,182,0,0.55))]"
            />
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center gap-5 p-8 sm:p-10">
            <span className="inline-flex items-center gap-2 text-base font-semibold text-brand-ink sm:text-lg">
              <Sparkles className="size-4 shrink-0" aria-hidden />
              <span>No es casualidad. Es vibración.</span>
              <Sparkles className="size-4 shrink-0" aria-hidden />
            </span>
            <h2 className="text-3xl font-semibold leading-[1.1] text-foreground sm:text-4xl lg:text-[2.8125rem]">
              ¿Por qué Numerología?
            </h2>
            <p className="text-lg leading-relaxed text-foreground/90">
              Te ha pasado que entras a un lugar y sientes que algo no cuadra… o
              conoces alguien y de inmediato te cae bien (o mal).
            </p>
            <p className="text-lg font-semibold leading-relaxed text-foreground">
              Todo en este mundo vibra: tú, yo, los lugares, las palabras… y sí,
              los números también.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
