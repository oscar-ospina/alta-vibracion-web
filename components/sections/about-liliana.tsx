import Image from "next/image";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { Badge } from "@saas/ui";

/**
 * Floating "comment" chips that orbit the portrait (Figma `card - comment`, 123:1180):
 * white pill, 18px radius, warm shadow (effect_17JLJY), Body/B1 SemiBold. The `pos`
 * classes place them absolutely around the portrait at md+ (literal strings so Tailwind
 * picks them up); on mobile they fall back to a centered wrapped row below the photo.
 */
const CHIPS = [
  { label: "📖 Autoconocimiento", pos: "md:absolute md:left-[-7%] md:top-[9%]" },
  { label: "✨ Energía", pos: "md:absolute md:right-[-6%] md:top-[27%]" },
  { label: "🧘‍♂️ Revelaciones", pos: "md:absolute md:left-[-7%] md:bottom-[26%]" },
  { label: "🔮 Precisión", pos: "md:absolute md:right-[-5%] md:bottom-[9%]" },
];

/**
 * "¿Quién es Liliana Tobón?" trust section (stories oscar-ospina/saas-planner#24 → #39):
 * heading + social-proof badge, then a row of the "✨ Todo tiene sentido" accordion (left)
 * and the portrait with four floating comment-chips (right), closing with the orange note.
 * Faithful to Figma `section3` (182:3897). No play affordance — there's no intro video.
 *
 * Accordion: @saas/ui ships no Accordion, so this uses a native <details>/<summary>
 * (no client boundary needed, unlike Radix). <summary> IS the accessible disclosure
 * button — keyboard-operable (Enter/Space) with native expanded/collapsed semantics, which
 * satisfies the #39 AC's "button + aria-expanded" intent without a literal aria-expanded.
 *
 * Badge: kept from #24 (social proof). @saas/ui has no green variant and the DS green
 * (#009966) isn't AA on green-light, so we pair the light-green bg with an AA-safe deeper
 * green (#006644 ≈ 6.6:1). Closing note uses orange-500 at >=24px (WCAG large text → 3:1),
 * the only tier where the brand orange stays AA on the light surface.
 */
export function AboutLiliana() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
          ¿Quién es Liliana Tobón?
        </h2>
        <Badge className="mt-4 border-transparent bg-semantic-green-light text-[#006644]">
          <BadgeCheck className="size-3.5" aria-hidden />
          +50 sesiones en Alta Vibración
        </Badge>
      </div>

      <div className="mt-12 grid items-center gap-10 md:grid-cols-2 md:gap-12">
        {/* Accordion (native <details>) — defaults open so the story shows, but stays
            collapsible + keyboard-operable; the chevron rotates with the open state. */}
        <details open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-1 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              ✨ Todo tiene sentido
            </span>
            {/* Rotates with the <details> open state. group-open isn't a Tailwind v4
                variant, so target the [open] ancestor directly; transition the `rotate`
                property (v4 rotate-* sets `rotate:`, which transition-transform ignores). */}
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-brand-ink transition-[rotate] duration-200 [[open]_&]:rotate-90">
              <ChevronRight className="size-6" aria-hidden />
            </span>
          </summary>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-foreground">
            <p>
              <strong className="font-semibold">
                A todos nos pasa lo mismo:
              </strong>{" "}
              repetimos patrones sin darnos cuenta, nos saboteamos, dudamos de lo
              que queremos. Pero cuando entiendes tu numerología,{" "}
              <strong className="font-semibold">TODO cobra sentido.</strong> Lo he
              visto en mí, en amigos, en clientes y en desconocidos.
            </p>
            <p>
              Hoy, mi propósito es compartir este conocimiento{" "}
              <strong className="font-semibold">
                para que más personas descubran su verdadero poder.
              </strong>
            </p>
          </div>
        </details>

        {/* Portrait + floating chips. Outer wrapper is `relative` (not clipped) so the
            chips can orbit/overflow the portrait edges at md+; the image itself is clipped
            to the rounded card. On mobile the chips become a wrapped row below the photo. */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="relative aspect-[6/7] overflow-hidden rounded-[2rem] shadow-md">
            <Image
              src="/lili-home-1.png"
              alt="Liliana Tobón"
              fill
              sizes="(min-width: 768px) 24rem, 100vw"
              className="object-cover"
            />
          </div>
          <ul className="mt-4 flex flex-wrap justify-center gap-2 md:mt-0 md:contents">
            {CHIPS.map((c) => (
              <li
                key={c.label}
                className={`inline-flex items-center rounded-[18px] bg-white px-3.5 py-2 text-sm font-semibold text-foreground shadow-[0_0_11px_rgba(51,16,10,0.15)] sm:text-base ${c.pos}`}
              >
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-3xl text-center font-display text-2xl font-semibold leading-snug text-orange-500 sm:text-[1.75rem]">
        Así que, si alguna vez sentiste que no encajas, que repites ciclos, que
        hay algo en ti que no entiendes… Créeme, tus números ya tienen la
        respuesta.
      </p>
    </section>
  );
}
