import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@saas/ui";
import { EXPECTATION_NOTE, LINES, isSellable, servicesOf } from "@/lib/catalog";

/**
 * "Universo 729" on the home (plan section 8): the four lines with the
 * services each is preparing. The 729 is a brand story about introspection,
 * bonds and contribution, not a technical classification. Future services
 * show no price, no date and no booking. Server component.
 */
export function Universe() {
  return (
    <section className="bg-orange-50/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-10">
        <h2 className="text-3xl font-bold text-foreground">Universo 729</h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Introspección, vínculos y contribución. Hoy se abre con tu primera sesión;
          estas son las experiencias que estamos preparando.
        </p>

        <ul className="mt-8 grid gap-5 md:grid-cols-2" data-testid="universe">
          {LINES.map((line) => {
            const services = servicesOf(line.id);
            return (
              <li key={line.id} className="flex">
                <Card className="flex w-full flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <h3 className="text-xl font-bold text-foreground">
                      <Link
                        href={line.path}
                        className="rounded-md hover:text-brand-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {line.navLabel}
                      </Link>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{line.intro}</p>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {services.map((s) => (
                        <li
                          key={s.id}
                          className={
                            isSellable(s)
                              ? "rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700"
                              : "rounded-full border border-neutral-200 px-3 py-1 text-xs text-muted-foreground"
                          }
                        >
                          {s.name}
                          {!isSellable(s) && " · en preparación"}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={line.path}
                      className="mt-auto inline-flex items-center gap-1 self-start rounded-md pt-2 text-sm font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
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
      </div>
    </section>
  );
}
