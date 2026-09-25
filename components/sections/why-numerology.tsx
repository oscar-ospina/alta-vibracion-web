import Image from "next/image";
import { Card } from "@saas/ui";

/**
 * "¿Por qué Numerología?" trust section (stories oscar-ospina/saas-planner#23/#24 → #38),
 * Figma `section2`: 182:3868 (1440), 932:4089 (950), 937:19043 (768), 937:19933 (767),
 * 937:19645 (350).
 *
 * Layout: from 768px (`md:`) a white card (182:3869, radius 32, no stroke, no shadow) with the
 * photo panel on the left and the content (eyebrow → H2 → two paragraphs) on the right. Below
 * 768px there is no card surface: a 252px photo rounded on all corners, then the text directly
 * on the #f6f6f9 page, flush with the photo edges, eyebrow centered.
 *
 * Vertical rhythm: from 950px (`desktop:`) the Figma section is a fixed 579px frame with the
 * card centered, which leaves 128px above and below the 323px card at 1440/1920 and 65.5px
 * around the 448px card at 950. `min-h-[579px]` + centering reproduces that; `py-16` is the
 * floor if the card ever grows taller. The 128px is what holds the line-art overflow.
 *
 * Photo: Figma image fcab5ad5… (blue night sky over a mountain ridge), cropped to the top
 * 78.7% the paint shows (`public/why-night-sky.jpg`, 1456x1124, the aspect of the master
 * component 182:4099, 604x466). The side-by-side frames squash or stretch it (0.66x vertical
 * at 1440/1920, 1.5-1.6x at 768-950) only because that instance was resized with a STRETCH
 * paint, so we keep the proportions: `object-cover` everywhere. From 768px it is anchored at
 * 50% 85%: in the landscape 624x320 panel (1440 up) that puts the peak at ~70% of the panel
 * height vs Figma's 75%, the closest ridge line to hero-2 that an undistorted crop allows
 * (83-88% all match about equally; 100% lifts the peak to ~63%). A scale would not help: the
 * ridge is the bottom quarter of the image, so any zoom only makes it taller. Where the panel
 * is less wide than the image's 1.3:1 (768 to ~1200px) cover fits the panel height, the y
 * anchor has no effect and only the sides are cropped; from ~1280px the panel is wider, cover
 * fits its width and the 85% anchor takes over. The phone frames are Figma's own uniform crops =
 * `object-bottom`. `sizes` follows the panel: 624px once the container caps at 1248px (1440
 * up), about half the viewport side by side, the full width on phones.
 *
 * Line-art: `why-asset2.svg` (182:4101, the -35.13° rotation is baked into the file) and
 * `why-asset.svg` (182:4109), flat #B3B5C6 strokes with #F2C40D accents and no effect. Only the
 * photo is clipped; the drawings overflow the card as in Figma (above, left, below and into the
 * content column). From 768px they are sized as a % of the panel width and anchored to its
 * vertical center (asset2 -52px, asset +65px), one rule that matches all four side-by-side
 * frames. Below 768px they are fixed sizes anchored to the panel's horizontal center (350
 * frame, `sm:` = 767 frame). The section clips on the x axis only (`overflow-x-clip`), so the
 * art never adds horizontal scroll while the vertical overflow stays visible. The content column
 * is `relative` so the text paints over any stroke that reaches it. Decorative → aria-hidden.
 *
 * Color: text #363744 (= text-foreground). The 18px SemiBold eyebrow is normal-size text, so
 * it uses brand-ink (#c5460d, Figma's Orange/500 hue darkened to AA: 4.93:1 on the white card,
 * 4.57:1 on the #f6f6f9 page on phones) instead of #F0601F (3.28:1), per the orange-text rule
 * in app/brand.css. Its ✨ glyphs are Figma's own emoji, kept aria-hidden.
 */
export function WhyNumerology() {
  return (
    <section className="container-page overflow-x-clip py-10 desktop:flex desktop:min-h-[579px] desktop:flex-col desktop:justify-center desktop:py-16">
      {/* No overflow-hidden here: the line-art must spill out of the card. bg-transparent below
          768px (Figma's phone frames have no card fill). */}
      <Card className="relative rounded-[2rem] border-0 bg-transparent p-0 shadow-none md:bg-card">
        <div className="grid md:grid-cols-2">
          {/* Photo panel: 252px tall on phones, the full card height side by side. */}
          <div className="relative h-[252px] md:h-auto">
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] md:rounded-r-none">
              <Image
                src="/why-night-sky.jpg"
                alt=""
                fill
                sizes="(min-width: 1440px) 624px, (min-width: 768px) 50vw, 100vw"
                className="object-cover object-bottom md:object-[50%_85%]"
              />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/why-asset2.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[calc(50%-170px)] top-[-37px] w-[208px] select-none sm:left-[calc(50%-244px)] sm:top-[-50px] sm:w-[288px] md:left-[-20.5%] md:top-[calc(50%-52px)] md:w-[79.3%] md:-translate-y-1/2"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/why-asset.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-[calc(50%-33px)] top-[77px] w-[187px] select-none sm:left-[calc(50%-55px)] sm:top-[28px] sm:w-[259px] md:left-[31.8%] md:top-[calc(50%+65px)] md:w-[71.2%] md:-translate-y-1/2"
            />
          </div>

          {/* Content */}
          <div className="relative flex flex-col justify-center gap-5 pt-5 md:px-5 md:py-10 desktop:p-10">
            {/* Figma: full-width centered line on phones with the ✨ tight to the words; from
                768px a 4px-padded label that hugs one line (it overflows the 299/312px text box
                at 950/768 rather than wrap) with a space-wide gap around each ✨. The emoji is
                set at 0.8em: Figma renders it ~15px wide, and at full size color-emoji fonts
                push the phone line onto two rows at 350px. */}
            <p className="text-body-b0-semibold text-center text-brand-ink md:p-1 md:text-left md:whitespace-nowrap">
              <span aria-hidden="true" className="text-[0.8em] leading-none md:mr-[0.3em]">✨</span>
              No es casualidad. Es vibración.
              <span aria-hidden="true" className="text-[0.8em] leading-none md:ml-[0.3em]">✨</span>
            </p>
            {/* 45px at every Figma width; below 350px (no frame) "Numerología?" would not fit. */}
            <h2 className="text-header-h2-semibold text-foreground max-[350px]:text-4xl">
              ¿Por qué Numerología?
            </h2>
            <p className="text-body-b0-regular text-foreground">
              Te ha pasado que entras a un lugar y sientes que algo no cuadra… o
              conoces alguien y de inmediato te cae bien (o mal).
            </p>
            <p className="text-body-b0-semibold text-foreground">
              Todo en este mundo vibra: tú, yo, los lugares, las palabras… y sí,
              los números también.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
