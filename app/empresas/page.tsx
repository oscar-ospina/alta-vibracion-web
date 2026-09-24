import type { Metadata } from "next";
import { LinePage } from "@/components/catalog/line-page";
import { findLine } from "@/lib/catalog";

const line = findLine("empresas")!;

export const metadata: Metadata = {
  title: "Empresas",
  description: line.intro,
};

/**
 * /empresas: catalog cards and voluntary interest. The plan (section 3) rules
 * out delivering numerology-derived profiles of employees to HR; the interest
 * registration asks for an organization and a topic, never employee data.
 */
export default function EmpresasPage() {
  return <LinePage line={line} />;
}
