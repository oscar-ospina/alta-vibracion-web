import type { MetadataRoute } from "next";
import { SITE_URL, ROUTES } from "@/lib/site";

/**
 * XML sitemap for crawlers (story oscar-ospina/saas-planner#22). Lists every public
 * route, absolute-resolved against SITE_URL (env-overridable per environment). Home
 * ranks highest; the legal/contact pages change rarely. Static marketing site, so
 * the route set is enumerated by hand — add new routes here as they ship.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
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
