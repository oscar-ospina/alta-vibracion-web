import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServicePage } from "@/components/catalog/service-page";
import { findServiceBySlug, servicesOf } from "@/lib/catalog";

export function generateStaticParams() {
  return servicesOf("yo").map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug("yo", slug);
  if (!service) return {};
  return { title: service.name, description: service.description };
}

/** /yo/mi-mapa-729 (active), /yo/mi-camino-729 and /yo/mi-huella-729 (in preparation). */
export default async function YoServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findServiceBySlug("yo", slug);
  if (!service) notFound();
  return <ServicePage service={service} />;
}
