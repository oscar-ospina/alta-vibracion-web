import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServicePage } from "@/components/catalog/service-page";
import { findServiceBySlug, servicesOf } from "@/lib/catalog";

export function generateStaticParams() {
  return servicesOf("nosotros").map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug("nosotros", slug);
  if (!service) return {};
  return { title: service.name, description: service.description };
}

/**
 * /nosotros/<slug>: the expectation template for the couple and family
 * proposals and for Match. Match is a placeholder here; the demo will live in
 * its own app and is never wired into this site.
 */
export default async function NosotrosServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findServiceBySlug("nosotros", slug);
  if (!service) notFound();
  const extra =
    service.id === "nos-04" ? (
      <p className="mt-6 max-w-2xl text-muted-foreground">
        Alta Vibración Match está en desarrollo como proyecto aparte. Aquí no hay
        registro de perfiles ni datos de personas: solo puedes decirnos que quieres
        conocerlo cuando esté listo.
      </p>
    ) : service.id === "nos-03" ? (
      <p className="mt-6 max-w-2xl text-muted-foreground">
        Este espacio es para el adulto. No pedimos nombre ni fecha de nacimiento de
        hijos, y la numerología no define aptitudes, conducta ni destino de menores.
      </p>
    ) : null;
  return <ServicePage service={service} extra={extra} />;
}
