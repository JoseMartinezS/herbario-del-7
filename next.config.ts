import type { NextConfig } from "next";

/**
 * Content-Security-Policy del documento (pragmática: blindar el sitio
 * sin romper nada de lo que ya funciona).
 *
 * Todos los recursos (JS de hidratación, CSS de Tailwind, SVGs de
 * /public, fuentes y la OG image) salen del propio origen; el único
 * contenido de terceros es el iframe de Google Maps de /ubicacion
 * (dominio exacto del embed: www.google.com).
 */
const contentSecurityPolicy = [
  // Fuente por defecto: sólo el propio origen.
  "default-src 'self'",
  // Next.js hidrata la app con <script> inline (self.__next_f) y el
  // JSON-LD de schema.org se embebe inline: sin 'unsafe-inline' la
  // hidratación muere. No hay scripts de terceros.
  "script-src 'self' 'unsafe-inline'",
  // Hoja de Tailwind v4 (mismo origen) + estilos inline de React.
  "style-src 'self' 'unsafe-inline'",
  // SVGs propios de /public y OG image generada en el mismo origen.
  "img-src 'self' data:",
  // Fraunces e Inter se cargan con next/font → self-hosted en
  // /_next/static/media (mismo origen).
  "font-src 'self' data:",
  // No hay fetch/XHR a terceros desde el cliente.
  "connect-src 'self'",
  // Único iframe del sitio: el embed de Google Maps de /ubicacion.
  // Ojo con el dominio: si no coincide EXACTO, el mapa se rompe.
  "frame-src https://www.google.com",
  // Sin <object>/<embed>, sin <base> y sin formularios con action
  // externo: se cierran por completo.
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Nadie puede embebernos en un iframe (refuerza X-Frame-Options).
  "frame-ancestors 'none'",
].join("; ");

/** Cabeceras de seguridad HTTP, aplicadas a todas las rutas. */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    // HTTPS obligatorio durante un año, incluyendo subdominios.
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "X-Content-Type-Options",
    // El navegador no adivina MIME types (mitiga sniffing).
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    // Cross-origin sólo envía el origen, no la URL completa.
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    // El sitio no puede embeberse en iframes de terceros.
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    // Capacidades sensibles del navegador: cerradas.
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  images: {
    // El logotipo y las ilustraciones del catálogo son SVG propios servidos
    // desde /public (mismo origen), así que se permite su paso por el
    // optimizador de next/image. La CSP neutraliza cualquier script embebido.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        // :path* = cero o más segmentos: casa con todas las rutas,
        // incluida la raíz.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
