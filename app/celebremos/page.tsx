import type { Metadata } from "next";
import { GiftBlock } from "@/components/catalog/gift-block";
import { LinePage } from "@/components/catalog/line-page";
import { findLine } from "@/lib/catalog";

const line = findLine("celebremos")!;

export const metadata: Metadata = {
  title: "Celebremos · 9",
  description: line.intro,
};

/**
 * /celebremos: the "Regala Mi Mapa 729" block first (plan section 8), then the
 * future proposals as interest cards. "Detalles con Sentido" stays in
 * preparation; only the first session can be given today.
 */
export default function CelebremosPage() {
  return <LinePage line={line} before={<GiftBlock />} />;
}
