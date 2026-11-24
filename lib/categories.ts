import categoriesData from "@/content/categories.json";
import { z } from "zod";
import {
  getSupabaseCatalogConfig,
  type SupabaseCatalogConfig,
} from "./supabase-catalog";
import { SLUG_REGEX } from "./slugify";
import { CATEGORIES } from "./types";
import type { Categoria, Category } from "./types";

/**
 * Capa de acceso a las CATEGORÍAS del catálogo (F2.5): espejo dual-mode
 * de lib/products.ts, decidido por las mismas env vars.
 *
 * - SIN `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` →
 *   categorías LOCALES: content/categories.json validado con zod, parseado
 *   una sola vez por proceso. Es el modo de CI y el respaldo permanente.
 * - CON ambas env vars → tabla `categories` de Supabase por REST
 *   (`/rest/v1/categories?select=…&order=posicion.asc`, mismos headers y
 *   timeout que el catálogo). Si el fetch falla, expira o no deja nada
 *   servible, se cae al JSON local con un console.warn: la navegación por
 *   categorías NUNCA se rompe por culpa de Supabase, y categories.json
 *   queda en el repo como snapshot semilla/backup.
 *
 * Las funciones son async porque el modo remoto es una lectura de red;
 * en modo local resuelven al instante. Solo se usan desde el servidor
 * (RSC y loaders de datos): nada de esto llega al cliente.
 *
 * Los helpers PUROS del final (slugsDeCategoria, nombreDeCategoria,
 * estiloDeCategoria, validarCategoriasDeCatalogo) son la única forma
 * legítima de resolver etiquetas y tintes en la UI: con categorías
 * dinámicas, indexar un Record compilado sería un crash esperando
 * pasar cuando entre la primera familia nueva.
 */

/** Timeout del fetch: si Supabase no responde, caemos al JSON local rápido. */
const REQUEST_TIMEOUT_MS = 5_000;

/** Columnas exactas que pedimos: fija el contrato de la respuesta REST. */
const CATEGORIES_SELECT = "slug,nombre,descripcion,posicion";

/**
 * Esquema zod de una categoría — valida content/categories.json al
 * cargarlo (y documenta la forma de la fila de la tabla). La membresía
 * de products.category contra esta lista la valida
 * validarCategoriasDeCatalogo (cross-validación fail-fast).
 */
const categoriaSchema = z.object({
  slug: z
    .string()
    .regex(SLUG_REGEX, "El slug de la categoría debe ir en kebab-case (minúsculas y guiones)."),
  nombre: z.string().min(1, "El nombre de la categoría es obligatorio."),
  descripcion: z.string(),
  posicion: z
    .number()
    .int("La posición debe ser un número entero.")
    .min(1, "La posición arranca en 1."),
});

/** Esquema de categories.json completo. */
const categoriaArraySchema = z.array(categoriaSchema);

/** Categorías locales: parsea y valida categories.json una vez por proceso. */
let localCategoriesCache: Categoria[] | null = null;

/**
 * Categorías del JSON local (parse único). Exportada porque la validación
 * cruzada del catálogo local (lib/products.ts) la necesita síncrona.
 */
export function getLocalCategories(): Categoria[] {
  if (localCategoriesCache === null) {
    localCategoriesCache = categoriaArraySchema.parse(categoriesData);
  }
  return localCategoriesCache;
}

/** Fila de `public.categories` tal como la devuelve PostgREST. */
interface CategoriaRow {
  slug: string;
  nombre: string;
  descripcion: string;
  posicion: number;
}

/**
 * Validación ESTRUCTURAL de una fila remota (tipos y formas): una fila
 * que no cumple esto jamás llega a la UI. La unicidad del slug ya la
 * garantiza el PRIMARY KEY de la tabla.
 */
function isCategoriaRow(row: unknown): row is CategoriaRow {
  if (typeof row !== "object" || row === null) {
    return false;
  }
  const r = row as Record<string, unknown>;
  return (
    typeof r.slug === "string" &&
    SLUG_REGEX.test(r.slug) &&
    typeof r.nombre === "string" &&
    r.nombre.length > 0 &&
    typeof r.descripcion === "string" &&
    typeof r.posicion === "number" &&
    Number.isFinite(r.posicion)
  );
}

/**
 * Trae las categorías desde Supabase (una sola llamada REST, ordenadas
 * por posicion como pide la URL). Lanza Error si la respuesta no es
 * servible: el fallback al JSON local vive acá mismo, un nivel arriba.
 */
async function fetchSupabaseCategories(
  config: SupabaseCatalogConfig,
): Promise<Categoria[]> {
  const endpoint =
    `${config.url}/rest/v1/categories` +
    `?select=${CATEGORIES_SELECT}&order=posicion.asc`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // Sin la caché de datos de Next: la memoización con TTL la controla
    // este módulo, visible y testeable (mismo criterio que products).
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `GET /rest/v1/categories respondió HTTP ${response.status}`,
    );
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("la respuesta de categorías no es un arreglo");
  }
  const categorias: Categoria[] = [];
  for (const [index, row] of rows.entries()) {
    if (!isCategoriaRow(row)) {
      console.warn(
        `[categorías] fila #${index + 1} de Supabase ignorada: no pasa la validación (revisa la tabla en el dashboard).`,
      );
      continue;
    }
    categorias.push({
      slug: row.slug,
      nombre: row.nombre,
      descripcion: row.descripcion,
      posicion: row.posicion,
    });
  }
  if (categorias.length === 0) {
    // Una lista vacía rompería la navegación por categorías: es señal
    // de tabla vacía o permisos mal, mejor caer a la semilla local.
    throw new Error("la respuesta no dejó ninguna categoría válida");
  }
  return categorias;
}

/**
 * Categorías remotas con fallback, memoizadas por REMOTE_TTL_MS (espejo
 * del catálogo, mismas razones): un mismo render consulta la lista
 * varias veces y todas comparten UN fetch; la ISR regenera fuera de la
 * ventana; y si el fetch falla, el cache se descarta para que el
 * siguiente intento reintente en vez de quedar pegado al fallback.
 */
const REMOTE_TTL_MS = 60_000;
let remoteCategoriesCache: {
  promise: Promise<Categoria[]>;
  cachedAt: number;
} | null = null;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getRemoteCategoriesWithFallback(
  config: SupabaseCatalogConfig,
): Promise<Categoria[]> {
  const cached = remoteCategoriesCache;
  if (cached !== null && Date.now() - cached.cachedAt < REMOTE_TTL_MS) {
    return cached.promise;
  }
  const promise = fetchSupabaseCategories(config).catch(
    (error: unknown): Categoria[] => {
      remoteCategoriesCache = null;
      console.warn(
        `[categorías] Supabase falló (${toErrorMessage(error)}); se sirve categories.json local como fallback.`,
      );
      return getLocalCategories();
    },
  );
  remoteCategoriesCache = { promise, cachedAt: Date.now() };
  return promise;
}

/** Categorías vigentes, en el orden de exhibición (posicion ascendente). */
export async function getCategoryList(): Promise<Categoria[]> {
  const config = getSupabaseCatalogConfig();
  if (config === null) {
    return getLocalCategories();
  }
  return getRemoteCategoriesWithFallback(config);
}

/** Set de slugs de una lista: lo que los guards de filas usan para
 *  validar product.category contra la lista VIGENTE (F2.5). */
export function slugsDeCategorias(
  categorias: readonly Categoria[],
): Set<string> {
  return new Set(categorias.map((categoria) => categoria.slug));
}

/**
 * Etiqueta legible de una categoría. Si el slug no está en la lista
 * (un dato raro que los guards no deberían dejar pasar), devuelve el
 * slug crudo: se ve raro pero NUNCA rompe el render.
 */
export function nombreDeCategoria(
  categorias: readonly Categoria[],
  slug: string,
): string {
  return (
    categorias.find((categoria) => categoria.slug === slug)?.nombre ?? slug
  );
}

/** ¿El slug es uno de la semilla histórica? (guard para indexar los
 *  estilos semilla, que siguen siendo un Record exhaustivo). */
function esSlugDeSemilla(slug: string): slug is Category {
  return (CATEGORIES as readonly string[]).includes(slug);
}

/**
 * Tinte histórico por categoría semilla: EXACTO al que usaban los badges
 * de la ficha y la tarjeta (migró de components/ProductCard.tsx, F2.5).
 * Tipado exhaustivo sobre la semilla: si mañana entra una 8ª familia a
 * CATEGORIES, el compilador exige su estilo acá.
 */
const ESTILOS_SEMILLA: Readonly<Record<Category, string>> = Object.freeze({
  veladoras: "border-terracotta-200 bg-terracotta-100 text-terracotta-800",
  "hierbas-y-preparados": "border-green-200 bg-green-100 text-green-800",
  "aguas-y-riegos": "border-green-200 bg-green-50 text-green-700",
  lociones: "border-terracotta-200 bg-terracotta-50 text-terracotta-800",
  "capsulas-y-suplementos": "border-gold-200 bg-gold-100 text-gold-800",
  "cuidado-personal": "border-green-200 bg-green-100 text-green-800",
  "sahumerios-e-inciensos": "border-gold-300 bg-gold-100 text-gold-900",
});

/**
 * Paleta rotativa para categorías NUEVAS (fuera de la semilla): tints del
 * mismo lenguaje cromático del sitio (terracota / verde / dorado / arena).
 * La rotación es determinística — misma categoría, mismo tinte, siempre —
 * para que el sitio no "baile" entre renders. El pulido fino de la paleta
 * lo hace el build de diseño (F4-F6); acá lo importante es que sea
 * estable y coherente.
 */
const PALETA_DINAMICA: readonly string[] = [
  "border-terracotta-200 bg-terracotta-50 text-terracotta-800",
  "border-green-200 bg-green-50 text-green-700",
  "border-gold-200 bg-gold-100 text-gold-800",
  "border-sand bg-cream-dark/60 text-green-800",
];

/** Índice estable para un slug que no está en la lista (dato raro):
 *  suma de códigos de sus caracteres — nunca depende del orden de
 *  llegada ni cambia entre renders. */
function indiceEstableDesdeSlug(slug: string): number {
  let suma = 0;
  for (let i = 0; i < slug.length; i += 1) {
    suma += slug.charCodeAt(i);
  }
  return suma % PALETA_DINAMICA.length;
}

/**
 * Tinte del badge de una categoría:
 * - semilla → el estilo histórico EXACTO (render byte-idéntico al de
 *   siempre);
 * - nueva → un tinte de la paleta, rotando por POSICIÓN (determinístico
 *   y curado: el dueño controla el orden de exhibición);
 * - slug que no está en la lista → rota por el índice del slug. Nunca
 *   crash: la UI siempre recibe un tinte servible.
 */
export function estiloDeCategoria(
  categorias: readonly Categoria[],
  slug: string,
): string {
  if (esSlugDeSemilla(slug)) {
    return ESTILOS_SEMILLA[slug];
  }
  const categoria = categorias.find((item) => item.slug === slug);
  const indice =
    categoria !== undefined
      ? categoria.posicion % PALETA_DINAMICA.length
      : indiceEstableDesdeSlug(slug);
  return PALETA_DINAMICA[indice];
}

/**
 * Validación cruzada del catálogo LOCAL (fail-fast preservado, F2.5):
 * cada product.category de content/products.json debe existir como slug
 * en content/categories.json. Antes lo garantizaba el z.enum del schema;
 * con categorías dinámicas la membresía no puede vivir en un enum —
 * revienta en desarrollo con un mensaje que dice QUÉ corregir, en vez
 * de pintar badges rotos en producción.
 */
export function validarCategoriasDeCatalogo(
  productos: ReadonlyArray<{ slug: string; category: string }>,
  categorias: readonly Categoria[],
): void {
  const slugsValidos = slugsDeCategorias(categorias);
  const huerfanos = productos.filter(
    (producto) => !slugsValidos.has(producto.category),
  );
  if (huerfanos.length > 0) {
    const detalle = huerfanos
      .map((producto) => `"${producto.slug}" (categoría "${producto.category}")`)
      .join(", ");
    throw new Error(
      `content/products.json tiene productos con categorías que no existen en content/categories.json: ${detalle}. Agregá la categoría a categories.json o corregí la categoría del producto.`,
    );
  }
}

/**
 * Descarta la memoización de categorías REMOTA (F2.5).
 *
 * La llamarán las Server Actions del panel justo después de mutar la
 * tabla categories (CRUD del build B): revalidatePath marca las páginas
 * para regenerar, pero la regeneración pasa por getCategoryList — y sin
 * esto podría servirse la copia memoizada de hasta 60 s atrás.
 * Mismo contrato que invalidateCatalogCache para products.
 */
export function invalidateCategoriesCache(): void {
  remoteCategoriesCache = null;
}

/**
 * @internal Borra los caches de categorías (local y remoto). Solo para
 * tests: los módulos viven durante toda la suite y sin esto el resultado
 * de un test contaminaría al siguiente.
 */
export function resetCategoriesCacheForTests(): void {
  localCategoriesCache = null;
  remoteCategoriesCache = null;
}
