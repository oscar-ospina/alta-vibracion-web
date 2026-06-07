import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidad" };

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">Política de Privacidad</h1>
      <p className="mt-4 text-muted-foreground">
        Contenido próximamente — esta página se completa en la historia
        oscar-ospina/saas-planner#26.
      </p>
    </section>
  );
}
