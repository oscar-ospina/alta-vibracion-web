import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Uso",
  description:
    "Términos y condiciones de uso del sitio de Alta Vibración, la práctica de numerología de Liliana Tobón.",
};

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">Términos de Uso</h1>
      <p className="mt-4 text-muted-foreground">
        Contenido próximamente — esta página se completa en la historia
        oscar-ospina/saas-planner#26.
      </p>
    </section>
  );
}
