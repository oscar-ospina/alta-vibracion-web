import type { Metadata } from "next";
import { DraftNotice } from "@/components/sections/draft-notice";
import { Prose } from "@/components/sections/prose";
import { readLegalDoc } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos de Uso",
  description:
    "Términos y condiciones de uso del sitio de Alta Vibración, la práctica de numerología de Liliana Tobón.",
};

export default function TermsPage() {
  const content = readLegalDoc("terms");
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">Términos de Uso</h1>
      <div className="mt-6">
        <DraftNotice />
      </div>
      <div className="mt-8">
        <Prose>{content}</Prose>
      </div>
    </article>
  );
}
