import { CATEGORIES, isCategory } from "./types";
import type { Product } from "./types";

/**
 * Lectura del catálogo desde la tabla `products` de Supabase (vía PostgREST).
 *
 * Decisión técnica (F2.1): fetch directo a la REST API de Supabase
 * (`/rest/v1/products?...`) en lugar del SDK oficial (@supabase/supabase-js).
 * Para UNA lectura server-side de una tabla pública, PostgREST resuelve
 * todo por URL (columnas, filtro de status y orden), y el SDK no aporta
 * nada que usemos aquí (auth en cliente, realtime, caché del cliente) a
 * cambio de sumar una dependencia y engordar el bundle. Este módulo lo
 * usa solo código del servidor (RSC / generateStaticParams / sitemap):
 * nada de Supabase llega al bundle del cliente en F2.1.
 *
 * Manejo de errores: todo lo que puede fallar (red, timeout, HTTP != 2xx,
 * JSON malformado, catálogo sin filas servibles) lanza Error; el fallback
 * a products.json lo atrapa lib/products.ts, que es la única puerta.
 *
 * Filas malformadas o retiradas NO tumban el catálogo completo: se filtran
 * con un console.warn (una fila mala del futuro panel no debe romper el
 * render público ni esconder al resto del catálogo).
 */

/** Config para hablar con Supabase; null si faltan env vars (modo JSON). */
export interface SupabaseCatalogConfig {
  /** URL del proyecto, sin slash final (p. ej. https://xxxx.supabase.co). */
  url: string;
  /** Publishable/anon key: de solo lectura pública, no es un secreto. */
  anonKey: string;
}

/**
 * Fila de `public.products` tal como la devuelve PostgREST: columnas
 * snake_case exactas que pedimos con `select=`. El mapeo a camelCase
 * (tipo Product) vive en mapRowToProduct.
 */
export interface ProductRow {
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  price: number | null;
  image: string;
  featured: boolean;
  status: string;
  position: number;
}

/** Timeout del fetch: si Supabase no responde, caemos al JSON local rápido. */
const REQUEST_TIMEOUT_MS = 5_000;

/** Columnas exactas que pedimos: fija el contrato de la respuesta. */
const PRODUCTS_SELECT = [
  "slug",
  "name",
  "short_description",
  "description",
  "category",
  "price",
  "image",
  "featured",
  "status",
  "position",
].join(",");

/** kebab-case, igual que el validador del JSON (lib/schema.ts). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Lee las env vars de Supabase. Devuelve null (→ modo JSON local) si falta
 * alguna o la URL no parsea: la activación es consciente, nunca accidental.
 * Se lee EN CADA llamada (no al importar) para que los tests puedan
 * simular ambos modos y para reaccionar a cambios de entorno.
 */
export function getSupabaseCatalogConfig(): SupabaseCatalogConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`protocolo ${parsed.protocol} no soportado`);
    }
    return { url: url.replace(/\/+$/, ""), anonKey };
  } catch {
    console.warn(
      `[catálogo] NEXT_PUBLIC_SUPABASE_URL tiene un valor inválido ("${url}"); se ignora y se usa products.json local.`,
    );
    return null;
  }
}

/**
 * Validación ESTRUCTURAL de una fila (tipos y formas), sin lógica de
 * dominio: la categoría se valida en el mapeo (isCategory) y el status se
 * filtra aparte. Es lo que protege el render público: una fila que no
 * cumple esto jamás llega a la UI, porque haría crashing
 * (p. ej. CATEGORY_INFO[category] undefined con una categoría inventada).
 *
 * Exportada desde F2.3: el panel (lib/admin-products.ts) reusa la misma
 * validación estructural para sus filas (que además traen `id`).
 */
export function isProductRow(row: unknown): row is ProductRow {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  const r = row as Record<string, unknown>;
  return (
    typeof r.slug === "string" &&
    SLUG_PATTERN.test(r.slug) &&
    typeof r.name === "string" &&
    r.name.length > 0 &&
    typeof r.short_description === "string" &&
    r.short_description.length > 0 &&
    typeof r.description === "string" &&
    r.description.length > 0 &&
    typeof r.category === "string" &&
    (r.price === null ||
      (typeof r.price === "number" &&
        Number.isFinite(r.price) &&
        r.price >= 0)) &&
    typeof r.image === "string" &&
    r.image.length > 0 &&
    (r.image.startsWith("/") ||
      r.image.startsWith("http://") ||
      r.image.startsWith("https://")) &&
    typeof r.featured === "boolean" &&
    typeof r.status === "string" &&
    typeof r.position === "number" &&
    Number.isFinite(r.position)
  );
}

/**
 * Mapea una fila VALIDADA al tipo Product (snake_case → camelCase).
 * Devuelve null solo si la categoría no es una de las 7 del dominio:
 * el resto ya quedó garantizado por isProductRow.
 */
export function mapRowToProduct(row: ProductRow): Product | null {
  if (!isCategory(row.category)) {
    return null;
  }
  return {
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category,
    price: row.price,
    image: row.image,
    featured: row.featured,
  };
}

/**
 * Convierte la respuesta cruda de PostgREST (unknown) en Products
 * servibles al público:
 * - descarta filas malformadas (con warn para diagnosticar en Vercel),
 * - descarta filas `retired` (silencioso: retirar es una operación normal),
 * - descarta slugs duplicados (protege generateStaticParams y los keys),
 * - mapea a camelCase.
 */
export function mapRowsToProducts(rows: unknown): Product[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  const products: Product[] = [];
  const seenSlugs = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (!isProductRow(row)) {
      console.warn(
        `[catálogo] fila #${index + 1} de Supabase ignorada: no pasa la validación (revisa tipos y valores de las columnas).`,
      );
      continue;
    }
    if (row.status !== "published") {
      continue;
    }
    const product = mapRowToProduct(row);
    if (product === null) {
      console.warn(
        `[catálogo] fila "${row.slug}" ignorada: categoría "${row.category}" fuera de las ${CATEGORIES.length} del sitio.`,
      );
      continue;
    }
    if (seenSlugs.has(product.slug)) {
      console.warn(
        `[catálogo] fila con slug duplicado "${product.slug}" ignorada.`,
      );
      continue;
    }
    seenSlugs.add(product.slug);
    products.push(product);
  }
  return products;
}

/**
 * Trae el catálogo publicado desde Supabase (una sola llamada REST).
 * Lanza Error si la respuesta no es servible: el fallback al JSON local
 * vive en lib/products.ts.
 */
export async function fetchSupabaseProducts(
  config: SupabaseCatalogConfig,
): Promise<Product[]> {
  const endpoint =
    `${config.url}/rest/v1/products` +
    `?select=${PRODUCTS_SELECT}&status=eq.published&order=position.asc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // Sin la caché de datos de Next: la memoización con TTL la controla
    // lib/products.ts, visible y testeable, en vez de la caché implícita.
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `GET /rest/v1/products respondió HTTP ${response.status}`,
    );
  }
  const rows: unknown = await response.json();
  const products = mapRowsToProducts(rows);
  if (products.length === 0) {
    throw new Error("la respuesta no dejó ningún producto publicado válido");
  }
  return products;
}
