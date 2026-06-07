import Image from "next/image";
import { BadgeCheck, Hash, Sparkles } from "lucide-react";
import { Badge } from "@saas/ui";

const BLOCKS = [
  {
    Icon: Hash,
    title: "Los números",
    body: "Cada número en mi vida hablaba de mi fuerza y mi propósito. Me ayudó a dejar de dudar de mí, a entender que no estaba rota ni sola.",
  },
  {
    Icon: Sparkles,
    title: "Todo tiene sentido",
    body: "A todos nos pasa lo mismo: repetimos patrones sin darnos cuenta. Pero cuando entiendes tu numerología, todo empieza a tener sentido.",
  },
];

/**
 * "¿Quién es Liliana Tobón?" trust section (story oscar-ospina/saas-planner#24):
 * heading + social-proof badge, portrait, and two story blocks with the tagline.
 * No play affordance — there's no intro video asset yet (per the AC, it's hidden).
 *
 * Badge: @saas/ui has no green variant and the DS green (#009966) isn't AA on
 * green-light, so we pair the DS light-green bg with an AA-safe deeper green
 * (#006644 ≈ 6.6:1). (DS green ramp is base-only — a future DS token gap.)
 */
export function AboutLiliana() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">
          ¿Quién es Liliana Tobón?
        </h2>
        <Badge className="mt-3 border-transparent bg-semantic-green-light text-[#006644]">
          <BadgeCheck className="size-3.5" aria-hidden />
          +50 sesiones en Alta Vibración
        </Badge>
      </div>

      <div className="mt-10 grid items-center gap-8 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-12">
        <div className="relative aspect-[6/7] overflow-hidden rounded-2xl shadow-md">
          <Image
            src="/lili-home-1.png"
            alt="Liliana Tobón"
            fill
            sizes="(min-width: 768px) 22rem, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-6">
          {BLOCKS.map(({ Icon, title, body }) => (
            <div key={title}>
              <h3 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <Icon className="size-5 text-brand-ink" aria-hidden />
                {title}
              </h3>
              <p className="mt-1.5 leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
          <p className="text-lg italic text-brand-ink">
            <span aria-hidden>✨</span> No es casualidad. Es vibración.{" "}
            <span aria-hidden>✨</span>
          </p>
        </div>
      </div>
    </section>
  );
}
