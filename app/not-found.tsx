import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * 404 inside the root layout (unknown URLs, and notFound() from /agenda/[code] and
 * /nosotros/[slug]). Next's built-in page injects `body { background: #fff }`,
 * which left the page-colored footer as a grey band; this one keeps the page color
 * and the brand chrome. Server component.
 */
export default function NotFound() {
  return (
    <section className="container-page py-20 desktop:py-32">
      <h1 className="text-header-h2-semibold text-foreground">No encontramos esta página</h1>
      <p className="mt-4 max-w-xl text-body-b0-regular text-foreground">
        Puede que el enlace haya cambiado o ya no exista.
      </p>
      <Link
        href={ROUTES.home}
        className="mt-8 inline-flex rounded-md text-body-b0-semibold text-brand-ink underline underline-offset-4 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
