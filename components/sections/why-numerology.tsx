import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@saas/ui";

/**
 * "¿Por qué Numerología?" trust section (story oscar-ospina/saas-planner#23 → #24):
 * a white Card with the cosmic "7" image + eyebrow, heading, and explainer.
 */
export function WhyNumerology() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
      <Card>
        <CardContent className="grid items-center gap-8 md:grid-cols-[minmax(0,16rem)_1fr] md:gap-10">
          {/* Cosmic square with the display "7" (numerology nod). */}
          <div className="relative aspect-square overflow-hidden rounded-2xl shadow-md">
            <Image
              src="/hero-bg-home.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 16rem, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                aria-hidden
                className="font-display text-7xl font-bold text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]"
              >
                7
              </span>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-ink">
              <Sparkles className="size-4" aria-hidden />
              No es casualidad. Es vibración.
            </span>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              ¿Por qué Numerología?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Todo en este mundo vibra: tú, yo, los lugares, las palabras… y sí,
              los números también. Cuando aprendes a leer esa vibración, dejas de
              dudar de ti y empiezas a entender tu propósito.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
