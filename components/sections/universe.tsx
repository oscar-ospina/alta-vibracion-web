import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@saas/ui";
import { EXPECTATION_NOTE, LINES, isSellable, servicesOf } from "@/lib/catalog";

/**
 * "Universo 729" on the home (plan section 8): the four lines with the
 * services each is preparing. The 729 is a brand story about introspection,
 * bonds and contribution, not a technical classification. Future services
 * show no price, no date and no booking. Server component.
 *
 * Plan V2.1 section with no Figma frame, harmonized with the design's section4
 * (182:3914) and the agenda cards: the page color (#f6f6f9) with no tinted band,
 * `container-page` with 80px of vertical padding from 950px and 40px below, the
 * Header/H2 SemiBold title, a Body/B0 lead in #363744, 40px to the cards and 28px
 * between them. Two columns from 640px: the design's 767 frame still sets section4
 * as two 349.5px cards (937:19980) and only the 350 frame stacks them. Cards are
 * white with no border or shadow (agenda Summary 776:12026: radius 16, padding 24,
 * gap 20), titled in Title Small (Archivo Medium 24) with the intro 8px below in
 * Body/B1. Service tags use the agenda chips' language (SemiBold, radius 8): the
 * one on sale in orange-100/orange-900 (8.59:1), the ones in preparation white with
 * the Surfaces ink hairline at 16% and #565973 text (6.84:1), the same pair as the
 * card's "En preparación" tag. The longest tag (313px) wraps inside itself in
 * cards under 361px wide, about 640-810px and phones under 400px; nowrap would
 * overflow the 262px column of a 350 phone.
 * "Ver …" links are brand-ink (#c5460d, AA at 16px) because Figma's Orange/500
 * only passes as large text.
 */
export function Universe() {
  return (
    <section className="container-page py-10 desktop:py-20">
      <h2 className="text-header-h2-semibold text-foreground">Universo 729</h2>
      <p className="mt-5 max-w-2xl text-body-b0-regular text-foreground">
        Introspección, vínculos y contribución. Hoy se abre con tu primera sesión;
        estas son las experiencias que estamos preparando.
      </p>

      <ul className="mt-10 grid gap-7 sm:grid-cols-2" data-testid="universe">
        {LINES.map((line) => {
          const services = servicesOf(line.id);
          return (
            <li key={line.id} className="flex">
              <Card className="flex w-full flex-col border-0 shadow-none">
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div>
                    <h3 className="text-title-title-small tracking-normal text-foreground">
                      <Link
                        href={line.path}
                        className="rounded-md hover:text-brand-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {line.navLabel}
                      </Link>
                    </h3>
                    <p className="mt-2 text-body-b1-regular text-foreground">{line.intro}</p>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <li
                        key={s.id}
                        className={
                          isSellable(s)
                            ? "rounded-lg border border-transparent bg-orange-100 px-3 py-1 text-body-b2-semibold text-orange-900"
                            : "rounded-lg border border-surface-ink/16 bg-card px-3 py-1 text-body-b2-semibold text-muted-foreground"
                        }
                      >
                        {s.name}
                        {!isSellable(s) && " · en preparación"}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={line.path}
                    className="mt-auto inline-flex items-center gap-1 self-start rounded-md text-body-b1-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Ver {line.title}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">{EXPECTATION_NOTE}</p>
    </section>
  );
}
