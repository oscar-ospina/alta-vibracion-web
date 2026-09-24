import type { MetadataRoute } from "next";
import { LINES, SERVICES, findLine, servicePath } from "@/lib/catalog";
import { SITE_URL, ROUTES } from "@/lib/site";

/**
 * XML sitemap. Public routes only: /admin, /agenda/<code> and the campaign
 * pages under /encuentros stay out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entry = (
    path: string,
    changeFrequency: "monthly" | "yearly",
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency, priority });

  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    entry(ROUTES.agenda, "monthly", 0.8),
    entry(ROUTES.gift, "monthly", 0.8),
    ...LINES.map((l) => entry(l.path, "monthly", 0.7)),
    ...SERVICES.filter((s) => s.status !== "draft" && findLine(s.line)!.hasDetailPages).map((s) =>
      entry(servicePath(s), "monthly", s.status === "active" ? 0.9 : 0.5),
    ),
    entry(ROUTES.contact, "yearly", 0.6),
    entry(ROUTES.terms, "yearly", 0.3),
    entry(ROUTES.privacy, "yearly", 0.3),
  ];
}
