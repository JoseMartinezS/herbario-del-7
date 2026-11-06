import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

/**
 * Sitemap estático (app/sitemap.ts → /sitemap.xml).
 *
 * Incluye todas las rutas públicas: páginas fijas, las fichas de producto
 * del catálogo y las páginas legales. /admin queda fuera a propósito (es
 * un panel interno y está marcado noindex; ver app/robots.ts).
 *
 * No se declara `lastModified` porque no llevamos registro de cambios por
 * página: publicar fechas inventadas sería engañar a los buscadores.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginasFijas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/nosotros`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/catalogo`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/ubicacion`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/contacto`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const fichasProductos: MetadataRoute.Sitemap = (await getProducts()).map(
    (product) => ({
      url: `${SITE_URL}/catalogo/${product.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    }),
  );

  return [...paginasFijas, ...fichasProductos];
}
