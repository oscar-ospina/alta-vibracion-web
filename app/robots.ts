import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** robots.txt: public site, except the admin and per-booking status pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/agenda/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
