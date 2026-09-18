import type { MetadataRoute } from "next";
import { SITE_URL, ROUTES } from "@/lib/site";

/** XML sitemap. Public routes only; /admin and /agenda/<code> stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    {
      url: `${SITE_URL}${ROUTES.agenda}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}${ROUTES.contact}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}${ROUTES.terms}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}${ROUTES.privacy}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
