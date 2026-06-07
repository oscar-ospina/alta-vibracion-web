import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads a legal/content Markdown document from `content/` at build time
 * (story oscar-ospina/saas-planner#26). The terms/privacy/contact pages are
 * statically prerendered, so this fs read happens during `next build` and the
 * output is baked into the static HTML — no runtime filesystem access.
 *
 * The source copy is a DRAFT (BORRADOR) and still carries `[POR CONFIRMAR: …]`
 * placeholders the practice owner must fill before publishing — edit the .md.
 */
export type LegalSlug = "terms" | "privacy" | "contact";

export function readLegalDoc(slug: LegalSlug): string {
  return readFileSync(join(process.cwd(), "content", `${slug}.md`), "utf8");
}
