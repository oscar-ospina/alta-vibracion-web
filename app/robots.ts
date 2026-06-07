import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt (story oscar-ospina/saas-planner#22). Public marketing site: allow all
 * crawlers everywhere and point them at the sitemap (absolute URL, env-driven). No
 * private areas to disallow yet — booking/checkout are deferred to a future app.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
