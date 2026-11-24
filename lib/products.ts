import productsData from "@/content/products.json";
import {
  getCategoryList,
  getLocalCategories,
  slugsDeCategorias,
  validarCategoriasDeCatalogo,
} from "./categories";
import { productArraySchema } from "./schema";
import {
  fetchSupabaseProducts,
  getSupabaseCatalogConfig,
} from "./supabase-catalog";
import type { SupabaseCatalogConfig } from "./supabase-catalog";
import type { Product } from "./types";

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
 * F2.5: las categorías dejaron de ser un enum compilado. La membresía de
 * product.category se valida contra la lista VIGENTE (content/categories.json
 * en local, tabla categories en remoto — lib/categories.ts): en local con
 * una validación cruzada fail-fast al cargar el JSON; en remoto con el Set
 * de slugs válidos que se pasa a los guards de filas.
 *
 * price: null se interpreta como "Consulta el precio por WhatsApp"
 * (hoy todo el catálogo se publica así; cargar el número al confirmarlo).
 */

/** Catálogo local: parsea y valida products.json una vez por proceso. */
let localCatalogCache: Product[] | null = null;

function getLocalCatalog(): Product[] {
  if (localCatalogCache === null) {
    const products = productArraySchema.parse(productsData);
    // Fail-fast local (F2.5): la membresía de categoría ya no vive en un
    // enum del schema — se valida cruzado contra categories.json, con un
    // error que dice qué producto corregir.
    validarCategoriasDeCatalogo(products, getLocalCategories());
    localCatalogCache = products;
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
  const promise = getCategoryList()
    .then((categorias) =>
      // La lista VIGENTE de categorías se resuelve ANTES de mapear filas:
      // los guards validan contra datos, no contra un enum compilado.
      fetchSupabaseProducts(config, slugsDeCategorias(categorias)),
    )
    .catch((error: unknown): Product[] => {
      remoteCatalogCache = null;
      console.warn(
        `[catálogo] Supabase falló (${toErrorMessage(error)}); se sirve products.json local como fallback.`,
      );
      return getLocalCatalog();
    });
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

/** Productos de una categoría (slug de la lista vigente), en el orden del catálogo. */
export async function getProductsByCategory(
  category: string,
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
 * Categorías VIGENTES (getCategoryList, orden de posicion) con su etiqueta
 * legible y número de productos. Misma forma de retorno de siempre — los
 * consumidores no se enteran del cambio de fuente (F2.5: antes CATEGORIES
 * compilado, ahora datos). Solo incluye categorías con al menos un
 * producto (una categoría vacía no tiene sentido en la navegación del
 * catálogo).
 */
export async function getCategoriesWithCounts(): Promise<
  Array<{
    category: string;
    name: string;
    count: number;
  }>
> {
  const [catalog, categorias] = await Promise.all([
    getCatalog(),
    getCategoryList(),
  ]);
  return categorias
    .map((categoria) => ({
      category: categoria.slug,
      name: categoria.nombre,
      count: catalog.filter((product) => product.category === categoria.slug)
        .length,
    }))
    .filter((entry) => entry.count > 0);
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

/**
 * Descarta la memoización del catálogo REMOTO (F2.3).
 *
 * La llaman las Server Actions del panel justo después de una mutación:
 * revalidatePath marca las páginas para regenerar, pero la regeneración
 * pasa por acá — y sin esto podría servirse la copia memoizada de hasta
 * 60 s atrás (REMOTE_TTL_MS), demorando el cambio en el sitio público.
 * Con la memoización descartada en el MISMO proceso de la action, la
 * regeneración inmediata hace un fetch fresco a Supabase.
 */
export function invalidateCatalogCache(): void {
  remoteCatalogCache = null;
}
