import type { Metadata } from "next";
import { DraftNotice } from "@/components/sections/draft-notice";
import { Prose } from "@/components/sections/prose";
import { readLegalDoc } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo Alta Vibración trata y protege tus datos personales conforme a la Ley 1581 de 2012 (Habeas Data) en Colombia.",
};

export default function PrivacyPage() {
  const content = readLegalDoc("privacy");
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">Política de Privacidad</h1>
      <div className="mt-6">
        <DraftNotice />
      </div>
      <div className="mt-8">
        <Prose>{content}</Prose>
      </div>
    </article>
  );
}
