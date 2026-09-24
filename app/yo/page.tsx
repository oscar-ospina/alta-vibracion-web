import type { Metadata } from "next";
import { LinePage } from "@/components/catalog/line-page";
import { findLine } from "@/lib/catalog";

const line = findLine("yo")!;

export const metadata: Metadata = {
  title: "Yo · 7",
  description: line.intro,
};

/** /yo: the three individual sessions in order; only Mi Mapa 729 sells. */
export default function YoPage() {
  return <LinePage line={line} />;
}
