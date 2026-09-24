import type { Metadata } from "next";
import { LinePage } from "@/components/catalog/line-page";
import { findLine } from "@/lib/catalog";

const line = findLine("nosotros")!;

export const metadata: Metadata = {
  title: "Nosotros · 2",
  description: line.intro,
};

/** /nosotros: couple, family bond and Match, all in preparation. */
export default function NosotrosPage() {
  return <LinePage line={line} />;
}
