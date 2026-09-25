import Image from "next/image";
import { Calendar, Gift } from "lucide-react";
import { AgendaCta } from "@/components/brand/agenda-cta";
import { GiftCta } from "@/components/brand/gift-cta";
import { FIRST_SESSION } from "@/lib/catalog";

/**
 * Home hero with the starry-sunset photo, the white line-art ("constelación"), the
 * H1 with its gradient accent, the subhead and the two CTAs from the plan, section 3.
 * The primary "Quiero mi primera sesión" goes to /agenda and the secondary "Regalar
 * una cita" to /regalar. Section 7.1 requires the second one on the home, next to
 * the first. Server component.
 *
 * Figma: hero section 182:3849, with breakpoint frames 932:4081 (950), 937:19035
 * (768) and 937:19484 (350).
 * - The section starts at the page top, under the transparent top bar (`-mt-16`).
 *   Figma's 80px top padding therefore counts from the page top, and the content
 *   clears the 64px bar. The bar is transparent only while the page is at the very
 *   top and turns solid on the first scroll (see TopBar).
 * - From 950px (`desktop:`) the hero is a row at least 713px tall. It is a minimum,
 *   so longer copy grows the section instead of being clipped. Padding 80/0/80/96,
 *   gap 40, both columns centered, which also centers the row at 1920 (text at
 *   x=336). The text column grows between 410 and 580px. The line-art box grows up
 *   to 723px at the 672:553 aspect of the Figma instance. At full size the box is
 *   595px tall and, as in Figma, overflows the 553px content box by 21px top and
 *   bottom (`-my-[21px]`). It starts at y=59 at 1440; the text never starts above 80.
 * - Below 950px the hero is a column with padding 80/32, gap 40 and the line-art
 *   first, up to 580px wide. Figma keeps 32px sides on phones too, so this section
 *   does not use `container-page`, which has 20px there.
 * - The photo (BG_Home 61:596, FILL) is at full strength over #24242d. There is no
 *   scrim from 950px. Below 950px the stacked text sits on the orange glow, so a 40%
 *   neutral-950 scrim dims the photo. An alpha sweep put the AA floor for the
 *   subhead and the outline CTA at 0.35.
 * - `sizes` is the width the photo is drawn at, not the section width. Object-cover
 *   scales the 3671x2000 photo to cover the section, so it is drawn
 *   max(section width, section height x 1.8355) wide. From 1309px that is the
 *   viewport. From 950 to 1308px the 713px row draws it 1309px wide. The stacked
 *   hero is 905 to 1020px tall between 350 and 949px, so the photo is drawn 1660 to
 *   1870px wide at any of those widths, and 1920px covers that. With `100vw`, a 2x
 *   phone fetched the 750w or 828w file and drew it upscaled about 4.5 times.
 * - H1 is Header/H1 Bold (56/60.48) from 768px and Header/H2 SemiBold (45/49.5)
 *   below, as in the 767 and 350 frames, in #f6f6f9. Figma paints the ts1 gradient
 *   (#f06b06 to #fac938, yellow on the left) across the whole H1 box and lets it
 *   show only through "esencia". `text-gradient-host` on the H1 does the same: it
 *   clips the ramp to the heading's glyphs, the solid #f6f6f9 paints over it, and
 *   the transparent `text-gradient-brand` word shows the slice of the ramp under it.
 *   The word is yellow where it starts a line, as at 1440, and a deeper orange where
 *   it sits mid-line, as in the 768 frame. Against the photo behind it, star specks
 *   aside, the word measures 4.3:1 or more at every width (large text needs 3:1).
 * - Subhead is Body/B0 Regular in #f6f6f9. Figma rounds its auto line height to
 *   25px; the DS token is 24.51px.
 * - `/hero-decoration.svg` is the illustration frame 182:3813, white paths only,
 *   with a 10px empty pad on each side. The percentage offsets put the frame at
 *   (-5.31, -18.10) of the 724x595.8 instance. At 1440 the drawing runs about 93px
 *   past the right edge and the section clips it.
 * - The glow is Figma's DROP_SHADOW r10, #ffb600 at 0.75, which Figma exports as a
 *   Gaussian blur with sigma 5. It is a CSS drop-shadow here, not a filter inside
 *   the SVG. A filter inside the SVG scales with the image, down to sigma 1.9px on a
 *   phone, where the halo swallows the lines. Figma keeps r10 at every breakpoint.
 *   The drop-shadow length is the standard deviation (measured in Chromium), so
 *   `5px` gives sigma 5 in CSS pixels at any size.
 *
 * Deliberate deviations. The subhead copy and both CTAs come from plan V2.1 and are
 * not in the Figma hero. The outline gift CTA has a 30% neutral-950 fill, so its
 * white label stays at AA over the bright glow near 950px. The CTA row sets the
 * focus ring (`--color-ring`) to neutral-50. The default orange ring drops to 1:1
 * over the orange glow; the light one stays at 3:1 or more.
 */
export function Hero() {
  return (
    <section className="relative isolate -mt-16 overflow-hidden bg-neutral-950">
      {/* Starry-sunset backdrop, the LCP image. */}
      <Image
        src="/hero-bg-home.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 1309px) 100vw, (min-width: 950px) 1309px, 1920px"
        className="object-cover"
      />
      {/* Stacked layout only. Dims the photo so the text over the glow stays at AA.
          The line-art paints above this layer and keeps its full strength. */}
      <div className="absolute inset-0 bg-neutral-950/40 desktop:hidden" />

      <div className="relative flex flex-col items-center gap-10 px-8 py-20 desktop:min-h-[713px] desktop:flex-row desktop:justify-center desktop:pr-0 desktop:pl-24">
        <div className="w-full desktop:max-w-[580px] desktop:min-w-[410px] desktop:flex-1">
          <h1 className="text-gradient-host text-header-h2-semibold text-neutral-50 md:text-header-h1-bold">
            Conecta con tu <span className="text-gradient-brand">esencia</span>{" "}
            a través de los números
          </h1>
          <p className="mt-5 text-body-b0-regular text-neutral-50">
            Cada número tiene una vibración única que habla de ti. Tu primera sesión
            individual de {FIRST_SESSION.durationMinutes} minutos es el comienzo: tu mapa,
            una pregunta personal y un resumen para conservar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 [--color-ring:var(--color-neutral-50)]">
            <AgendaCta source="hero" size="lg">
              <Calendar className="size-5" aria-hidden />
              Quiero mi primera sesión
            </AgendaCta>
            <GiftCta
              source="hero"
              size="lg"
              className="border-white/60 bg-neutral-950/30 text-white hover:bg-neutral-950/50 hover:text-white"
            >
              <Gift className="size-5" aria-hidden />
              Regalar una cita
            </GiftCta>
          </div>
        </div>

        {/* Line-art box, standing in for the Figma "hero image" instance. It sits above
            the text below 950px and on the right from 950px. Decorative. */}
        <div
          aria-hidden
          className="pointer-events-none relative order-first aspect-[672/553] w-full max-w-[580px] select-none desktop:order-none desktop:-my-[21px] desktop:max-w-[723px] desktop:flex-1"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-decoration.svg"
            alt=""
            className="absolute top-[-4.717%] left-[-2.115%] h-auto w-[116.44%] max-w-none [filter:drop-shadow(0_0_5px_rgb(255_182_0/0.75))]"
          />
        </div>
      </div>
    </section>
  );
}
