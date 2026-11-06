import productsData from "@/content/products.json";
import { productArraySchema } from "./schema";
import {
  fetchSupabaseProducts,
  getSupabaseCatalogConfig,
} from "./supabase-catalog";
import type { SupabaseCatalogConfig } from "./supabase-catalog";
import { CATEGORIES, CATEGORY_INFO } from "./types";
import type { Category, Product } from "./types";

/**
 * Capa de acceso al catálogo. Toda la UI lee los productos desde aquí;
 * nadie debería importar content/products.json directamente.
 *
 * Doble modo (F2.1), decidido por env vars:
 * - SIN `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` →
 *   catálogo LOCAL: content/products.json validado con zod (lib/schema.ts),
 *   parseado una sola vez por proceso. Es el modo original del sitio y el
 *   que usa CI (el build corre sin env vars de Supabase).
 * - CON ambas env vars → catálogo REMOTO: la tabla `products` de Supabase
 *   (lib/supabase-catalog.ts). Si el fetch falla, expira o la respuesta no
 *   deja nada servible, se cae al JSON local con un console.warn: el sitio
 *   NUNCA se rompe por culpa de Supabase, y products.json queda en el repo
 *   como snapshot semilla/backup.
 *
 * Las funciones son async porque el modo remoto es una lectura de red; en
 * modo local resuelven al instante. Solo se usan desde el servidor (RSC,
 * generateStaticParams, sitemap): nada de esto llega al cliente.
 *
 * price: null se interpreta como "Consulta el precio por WhatsApp"
 * (hoy todo el catálogo se publica así; cargar el número al confirmarlo).
 */

/** Catálogo local: parsea y valida products.json una vez por proceso. */
let localCatalogCache: Product[] | null = null;

function getLocalCatalog(): Product[] {
  if (localCatalogCache === null) {
    localCatalogCache = productArraySchema.parse(productsData);
  }
  return localCatalogCache;
}

/**
 * Catálogo remoto con fallback, memoizado por REMOTE_TTL_MS:
 * - un mismo render llama varias funciones (getProducts +
 *   getFeaturedProducts + …) y todas deben compartir UN solo fetch;
 * - la ISR horaria (revalidate = 3600 en las páginas) regenera fuera de
 *   esa ventana y refresca los datos;
 * - si el fetch falla, el cache se descarta para que el siguiente intento
 *   reintente en vez de quedar pegado al fallback todo el TTL.
 */
const REMOTE_TTL_MS = 60_000;
let remoteCatalogCache: {
  promise: Promise<Product[]>;
  cachedAt: number;
} | null = null;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getRemoteCatalogWithFallback(
  config: SupabaseCatalogConfig,
): Promise<Product[]> {
  const cached = remoteCatalogCache;
  if (cached !== null && Date.now() - cached.cachedAt < REMOTE_TTL_MS) {
    return cached.promise;
  }
  const promise = fetchSupabaseProducts(config).catch(
    (error: unknown): Product[] => {
      remoteCatalogCache = null;
      console.warn(
        `[catálogo] Supabase falló (${toErrorMessage(error)}); se sirve products.json local como fallback.`,
      );
      return getLocalCatalog();
    },
  );
  remoteCatalogCache = { promise, cachedAt: Date.now() };
  return promise;
}

/** Catálogo según el modo activo (env vars presentes → remoto; si no, local). */
async function getCatalog(): Promise<Product[]> {
  const config = getSupabaseCatalogConfig();
  if (config === null) {
    return getLocalCatalog();
  }
  return getRemoteCatalogWithFallback(config);
}

/** Catálogo completo, en el orden de la fuente (JSON o `position` de la tabla). */
export async function getProducts(): Promise<Product[]> {
  return getCatalog();
}

/** Busca un producto por su slug (undefined si no existe). */
export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  return (await getCatalog()).find((product) => product.slug === slug);
}

/** Productos de una categoría, en el orden del catálogo. */
export async function getProductsByCategory(
  category: Category,
): Promise<Product[]> {
  return (await getCatalog()).filter(
    (product) => product.category === category,
  );
}

/** Productos marcados como destacados (para el home). */
export async function getFeaturedProducts(): Promise<Product[]> {
  return (await getCatalog()).filter(
    (product) => product.featured === true,
  );
}

/**
 * Categorías con su etiqueta legible y número de productos.
 * Solo incluye categorías con al menos un producto (una categoría vacía no
 * tiene sentido en la navegación del catálogo).
 */
export async function getCategoriesWithCounts(): Promise<
  Array<{
    category: Category;
    name: string;
    count: number;
  }>
> {
  const catalog = await getCatalog();
  return CATEGORIES.map((category) => ({
    category,
    name: CATEGORY_INFO[category].name,
    count: catalog.filter((product) => product.category === category).length,
  })).filter((entry) => entry.count > 0);
}

/**
 * @internal Borra los caches del catálogo (local y remoto). Solo para
 * tests: los módulos viven durante toda la suite y sin esto el resultado
 * de un test contaminaría al siguiente.
 */
export function resetCatalogCacheForTests(): void {
  localCatalogCache = null;
  remoteCatalogCache = null;
}
