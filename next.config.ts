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
  // SVGs propios de /public y OG image generada en el mismo origen. En
  // modo Supabase las imágenes del catálogo también pasan por el
  // optimizador de next/image (/_next/image: mismo origen), así que no hay
  // que abrir img-src a terceros. `blob:` es para el panel admin (F2.3):
  // la foto elegida se decodifica y previsualiza vía objectURL en el
  // propio navegador, y sin este esquema la CSP bloqueaba al dueño
  // (falso positivo encontrado en el smoke del 7-nov; contrato fijado en
  // tests/e2e/security.spec.ts). blob: solo existe dentro de la propia
  // pestaña: no es una puerta para terceros.
  "img-src 'self' data: blob:",
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

/**
 * Imágenes remotas del catálogo (modo Supabase).
 *
 * En modo Supabase, `product.image` es una URL absoluta del bucket público
 * de Storage, y next/image REQUIERE que el host esté declarado aquí (si
 * no, el render falla). El patrón se deriva de NEXT_PUBLIC_SUPABASE_URL
 * al momento del build: sin la env var no se agrega nada y la config queda
 * idéntica al modo JSON local (imágenes propias de /public). Se declara el
 * host EXACTO del proyecto, no un wildcard: si cambiara el proyecto de
 * Supabase, el build avisa en vez de aceptar cualquier host.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseImagePattern: { protocol: "http" | "https"; hostname: string } | null =
  null;
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    supabaseImagePattern = {
      protocol: parsed.protocol === "http:" ? "http" : "https",
      hostname: parsed.hostname,
    };
  } catch {
    // URL malformada: el modo remoto se ignora igual desde lib/products.ts
    // (caída al JSON local); aquí no hay nada que declarar.
  }
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // F2.3: el panel sube la foto del producto por Server Action (ya
      // comprimida en el navegador: máx. 1200 px en WebP). El default de
      // 1 mb quedaría corto para un SVG grande; el techo real es el
      // límite del bucket (10 mb, validado en el cliente Y en la action).
      bodySizeLimit: "10mb",
    },
  },
  images: {
    ...(supabaseImagePattern ? { remotePatterns: [supabaseImagePattern] } : {}),
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
