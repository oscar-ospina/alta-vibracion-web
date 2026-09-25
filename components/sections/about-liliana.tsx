import Image from "next/image";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { Badge } from "@saas/ui";

/**
 * Keyword chips on the portrait (Figma `card - comment`, 123:1180): #f6f6f9 pill, 18px
 * radius, 40px tall, 12px side padding, Body/B1 SemiBold (16/24), warm glow (#33100a at
 * 15%, blur 11.1). Each chip is at least 120px wide with its content centered: Figma's
 * Energía keeps Precisión's fixed 96px text box, so it is 120 wide, not the 110 its
 * content needs. Figma pairs them in two corners: Revelaciones + Precisión top-left,
 * Energía + Autoconocimiento bottom-right. On the 504px photo (xl; Home frame 182:3902 and
 * hero-2.png) they sit inside, 20px from the edges. On the 310px photo (950–1279; frame
 * 932:4103) Figma pushes them half outside so they do not cover her face; the right-hand
 * pair is anchored by `right`, so the overhang holds whatever width the chip renders at.
 * `pos` holds literal class strings so Tailwind picks them up.
 */
const CHIPS = [
  { emoji: "🧘‍♂️", label: "Revelaciones", pos: "-left-[29px] -top-[27px] xl:left-5 xl:top-5" },
  { emoji: "🔮", label: "Precisión", pos: "-left-3 top-[21px] xl:left-5 xl:top-[68px]" },
  { emoji: "✨", label: "Energía", pos: "-right-[17px] bottom-7 xl:right-5 xl:bottom-[68px]" },
  { emoji: "📖", label: "Autoconocimiento", pos: "-right-[37px] -bottom-5 xl:right-5 xl:bottom-5" },
];

/**
 * "¿Quién es Liliana Tobón?" trust section, Figma `section3` (182:3897; hero-2.png at 1440;
 * 932:4098 at 950, 937:19052 at 768, 937:19961 / 937:19675 on phones). Title and badge,
 * then the "✨ Todo tiene sentido" story next to the portrait, then the orange closing
 * note, 40px apart. Padding 80/96 from 950px, 40/32 at 768, 40/20 on phones
 * (`container-page` plus `py-10 desktop:py-20`).
 *
 * Type follows the DS scale: title Header/H1 Bold 56 from 768px and Header/H2 SemiBold 45
 * below; story title H2 SemiBold 45 at every width; body Body/B0 Regular 18/24.5 with 20px
 * between paragraphs; note Title Medium 28 SemiBold from 768px and Title Small 24 Medium
 * below, full content width. Orange follows the 2026-09-24 rule in app/brand.css: the note
 * is large text, so it keeps Figma's Orange/500 (3.04:1, needs 3:1); the 18px highlights
 * are not, so they use brand-ink (4.57:1) instead of Orange/500.
 *
 * Layout: from 768px a fluid story column and a fixed photo, 40px apart (Figma `contents`,
 * 704 + 40 + 504 at 1440). Below 768 they stack 20px apart with the photo first, full
 * width by 384. The photo is 384 tall at every width: 504 wide from xl (1280) and 310 at
 * 768–1279, as in the 950 and 768 frames. Figma has no frame between 950 and 1440, so xl
 * is our switch point; its 1920 frame goes back to 310, which reads as a designer
 * inconsistency and is not followed. The switch must stay the same breakpoint for the
 * width, the object-position and the chip placement. Radius 32 and no shadow. The chips
 * exist only from 950px; the 768 and phone frames have none.
 *
 * Portrait: Figma's balcony photo (image 3cd357b6… in Foto_Lili_Home 192:3957), cropped
 * once to the 1458x940 region that holds every Figma framing (source x 26–1484,
 * y 238–1178). The horizontal object-position matches each frame: 39% at xl, 47% at
 * 768–1279 and 45% on phones. The vertical 9% only matters on wide phones, where the
 * frame is wider than the file and the crop happens top and bottom (767 frame: source
 * y 253–1023). The doodled lili-home-1.png was the hidden layer under it; /agenda still
 * uses that file. `sizes` gives the width the file is drawn at, not the frame width:
 * object-cover scales it to the 384px height, 596px wide (384 × 1458/940), so any frame
 * narrower than that (504, 310 and phones below 636px) shows a 596px-wide image, and only
 * from 636 to 767px, where the frame is wider, does the frame width set it. Asking for
 * the frame width made a 2x screen at 768–1279px fetch the 640px file for a 1192px draw.
 *
 * Deliberate deviations. Figma's story block is a three-slide carousel ("De dónde vengo",
 * "Los números", "Todo tiene sentido") driven by a prev/next chevron pair; we ship only
 * the third slide as a native <details> accordion, so there is one chevron, styled like
 * Figma's (36px circle in Surfaces ink #272f4e at 8%, dark 28px glyph; lucide's stroke is
 * thinned to 1.5, about 1.75px, to match the export's Material chevron) and kept in the
 * title row on phones, where Figma centers its pair under the text. To leave the 45px
 * title the room Figma gives it there (phone frame 937:19682: 294px, two lines at 350),
 * the phone row has no right padding and only 8px before the chevron; Figma's 16px right
 * pad and 20px gap return from 768px. The title then wraps to two lines from 350px (three
 * at 320, which Figma does not draw) and fits on one from about 525px. The "+50 sesiones"
 * badge is plan V2.1 content with no Figma counterpart; it sits 20px under the title (the
 * title frame's gap) and stays green like the same badge on /agenda (#006644 on #ecfdf5,
 * 6.68:1).
 *
 * Accordion: @saas/ui ships no Accordion, so this uses a native <details>/<summary>
 * (no client boundary needed, unlike Radix). <summary> IS the accessible disclosure
 * button: keyboard-operable (Enter/Space) with native expanded/collapsed semantics, which
 * satisfies the #39 AC's "button + aria-expanded" intent without a literal aria-expanded.
 */
export function AboutLiliana() {
  return (
    <section className="container-page py-10 desktop:py-20">
      <div className="text-center">
        <h2 className="text-header-h2-semibold text-foreground md:text-header-h1-bold">
          ¿Quién es Liliana Tobón?
        </h2>
        <Badge className="mt-5 border-transparent bg-semantic-green-light text-[#006644]">
          <BadgeCheck className="size-3.5" aria-hidden />
          +50 sesiones en Alta Vibración
        </Badge>
      </div>

      <div className="mt-10 flex flex-col gap-5 md:flex-row md:items-center md:gap-10">
        {/* Accordion (native <details>): defaults open so the story shows, but stays
            collapsible and keyboard-operable; the chevron rotates with the open state. */}
        <details open className="md:min-w-0 md:flex-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring md:gap-5 md:pr-4 [&::-webkit-details-marker]:hidden">
            <span className="font-display text-header-h2-semibold text-foreground">
              <span aria-hidden="true">✨</span> Todo tiene sentido
            </span>
            {/* Rotates with the <details> open state. group-open isn't a Tailwind v4
                variant, so target the [open] ancestor directly; transition the `rotate`
                property (v4 rotate-* sets `rotate:`, which transition-transform ignores). */}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-ink/8 text-foreground transition-[rotate] duration-200 motion-reduce:transition-none [[open]_&]:rotate-90">
              <ChevronRight className="size-7" strokeWidth={1.5} aria-hidden />
            </span>
          </summary>
          <div className="mt-5 space-y-5 text-body-b0-regular text-foreground">
            <p>
              <strong className="font-semibold text-brand-ink">
                A todos nos pasa lo mismo:
              </strong>{" "}
              repetimos patrones sin darnos cuenta, nos saboteamos, dudamos de lo
              que queremos. Pero cuando entiendes tu numerología,{" "}
              <strong className="font-semibold text-brand-ink">TODO cobra sentido.</strong>{" "}
              Lo he visto en mí, en amigos, en clientes y en desconocidos.
            </p>
            <p>
              Hoy, mi propósito es compartir este conocimiento{" "}
              <strong className="font-semibold text-brand-ink">
                para que más personas descubran su verdadero poder.
              </strong>
            </p>
          </div>
        </details>

        {/* Portrait + chips. The outer wrapper is not clipped, so the 950–1279 chips can
            overhang the photo; only the inner frame clips the image to the radius. */}
        <div className="relative order-first h-96 w-full shrink-0 md:order-none md:w-[310px] xl:w-[504px]">
          <div className="relative h-full overflow-hidden rounded-[2rem]">
            <Image
              src="/lili-portrait.jpg"
              alt="Liliana Tobón"
              fill
              sizes="(min-width: 768px) 596px, (min-width: 636px) calc(100vw - 40px), 596px"
              className="object-cover object-[45%_9%] md:object-[47%_9%] xl:object-[39%_9%]"
            />
          </div>
          {/* Overlay with the photo's box, so each chip is placed against the photo.
              role="list" keeps list semantics, which list-style:none drops in Safari. */}
          <ul role="list" className="absolute inset-0 hidden desktop:block">
            {CHIPS.map((c) => (
              <li
                key={c.label}
                className={`absolute flex h-10 min-w-30 items-center justify-center gap-2 whitespace-nowrap rounded-[18px] bg-background px-3 text-body-b1-semibold text-foreground shadow-[0_0_11.1px_rgba(51,16,10,0.15)] ${c.pos}`}
              >
                <span aria-hidden="true">{c.emoji}</span>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-10 text-center font-display text-title-title-small text-orange-500 md:text-title-titel-medium">
        Así que, si alguna vez sentiste que no encajas, que repites ciclos, que
        hay algo en ti que no entiendes… Créeme, tus números ya tienen la
        respuesta.
      </p>
    </section>
  );
}
