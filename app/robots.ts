import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt (app/robots.ts → /robots.txt).
 *
 * Todo el sitio público se puede indexar; /admin es un panel interno
 * (además marcado noindex en sus propios metadatos) y se excluye.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
