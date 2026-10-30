/**
 * URL pública del sitio (sin slash final).
 *
 * Única fuente de verdad para construir URLs absolutas fuera de los
 * metadatos de página: JSON-LD (components/JsonLd.tsx), sitemap
 * (app/sitemap.ts), robots (app/robots.ts). `app/layout.tsx` mantiene su
 * propia constante local para `metadataBase`; ambos leen la misma variable
 * de entorno, así que no divergen.
 *
 * En producción debe apuntar al dominio real (ver .env.example).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://herbariodel7.com";
