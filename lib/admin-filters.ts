import { isCategory, type Category } from "./types";

/**
 * Búsqueda, filtros y orden de la lista del panel (Polish del panel).
 *
 * Funciones PURAS (sin React ni red): la página /admin parsea acá sus
 * `searchParams`, arma las URLs de los controles y filtra/ordena la
 * lista con el mismo módulo — todo testeable con Vitest sin montar
 * nada.
 *
 * Por qué los filtros viven en la URL y no en estado del cliente:
 * una vista armada ("solo retirados de veladoras") se puede recargar,
 * guardar o compartir tal cual; no hay estado duplicado que sincronizar
 * y la lista sigue funcionando igual sin JavaScript.
 *
 * Tolerancia ante basura: cualquier parámetro inválido cae a su default
 * silenciosamente — un link viejo o una URL editada a mano jamás rompe
 * el panel (misma filosofía que sanitizeNextPath).
 *
 * Contrato de los parámetros (defaults en DEFAULT_ADMIN_FILTERS):
 * - `q`: texto libre; matchea name Y slug, sin acentos ni mayúsculas.
 * - `estado`: `todos` | `publicados` | `retirados` (default `todos`).
 * - `categoria`: slug de las 7 categorías | `todas` (default `todas`).
 * - `destacados`: `1` activa "solo destacados" (default off).
 * - `orden`: `posicion` | `nombre` | `editados` (default `posicion`).
 */

/** Filtro de estado de la fila (los valores que viajan en la URL, en español). */
export type AdminStatusFilter = "todos" | "publicados" | "retirados";

/** Criterio de orden de la lista (los valores que viajan en la URL). */
export type AdminOrderFilter = "posicion" | "nombre" | "editados";

/** Filtros de la lista, ya parseados y validados (todos con default sano). */
export interface AdminFilters {
  /** Texto de búsqueda crudo (recortado y con tope de largo); "" = sin filtro. */
  search: string;
  status: AdminStatusFilter;
  category: Category | "todas";
  featuredOnly: boolean;
  order: AdminOrderFilter;
}

/** Defaults de fábrica de la lista: todo el catálogo por posición. */
export const DEFAULT_ADMIN_FILTERS: Readonly<AdminFilters> = Object.freeze({
  search: "",
  status: "todos",
  category: "todas",
  featuredOnly: false,
  order: "posicion",
});

/**
 * Tope defensivo del texto de búsqueda: 100 caracteres alcanzan para
 * cualquier nombre del catálogo; lo que venga por URL más largo se
 * recorta (una búsqueda que no matchea nada es inofensiva, una URL
 * gigante no tiene por qué entrar al render).
 */
const SEARCH_MAX_CHARS = 100;

/**
 * Normaliza texto para comparar: minúsculas + NFD + strip de marcas
 * diacríticas (á→a, ü→u), la misma filosofía de lib/slugify.ts. Buscar
 * "lagrimas" tiene que encontrar "Lágrimas de María".
 */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Toma el primer valor de un parámetro (por si viene repetido en la URL). */
function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Parsea y valida los searchParams de /admin → AdminFilters.
 *
 * Todo valor inválido (estado inventado, categoría fuera de las 7,
 * orden raro, destacados distinto de "1") cae a su default sin error:
 * el panel no se rompe por una URL editada a mano.
 */
export function parseAdminFilters(
  params: Record<string, string | string[] | undefined>,
): AdminFilters {
  const search =
    primerValor(params.q)?.trim().slice(0, SEARCH_MAX_CHARS) ?? "";

  const estado = primerValor(params.estado);
  const status: AdminStatusFilter =
    estado === "publicados" || estado === "retirados" ? estado : "todos";

  const categoria = primerValor(params.categoria);
  const category: Category | "todas" = isCategory(categoria)
    ? categoria
    : "todas";

  const featuredOnly = primerValor(params.destacados) === "1";

  const orden = primerValor(params.orden);
  const order: AdminOrderFilter =
    orden === "nombre" || orden === "editados" ? orden : "posicion";

  return { search, status, category, featuredOnly, order };
}

/**
 * Lo mínimo que la lista necesita de un producto para filtrarlo y
 * ordenarlo. AdminProduct (lib/admin-products.ts) cumple este contrato
 * sin acoplarse: acá no se importa nada de Supabase ni de Next.
 */
export interface AdminListProduct {
  name: string;
  slug: string;
  category: Category;
  status: "published" | "retired";
  featured: boolean;
  position: number;
  /** ISO 8601 de la última edición (updated_at de la tabla). */
  updatedAt: string;
}

/**
 * ¿El producto matchea el texto de búsqueda? (name y slug, sin acentos
 * ni mayúsculas). Texto vacío o de solo espacios = sin filtro → true.
 */
export function matchesSearchText(
  product: Pick<AdminListProduct, "name" | "slug">,
  search: string,
): boolean {
  const query = normalizeSearchText(search);
  if (query === "") {
    return true;
  }
  return (
    normalizeSearchText(product.name).includes(query) ||
    product.slug.includes(query)
  );
}

/** Compara dos nombres ya sin acentos (orden alfabético simple, determinístico). */
function compararSinAcentos(a: string, b: string): number {
  const na = normalizeSearchText(a);
  const nb = normalizeSearchText(b);
  return na < nb ? -1 : na > nb ? 1 : 0;
}

/**
 * Época (ms) de un timestamp ISO; 0 si no parsea (una fila sin fecha
 * válida ordena como "la más vieja" en vez de romper el sort).
 */
function epochDe(iso: string): number {
  const epoch = Date.parse(iso);
  return Number.isNaN(epoch) ? 0 : epoch;
}

/**
 * Filtra y ordena la lista según los filtros. Devuelve un array NUEVO
 * (el de entrada no se toca) y es estable: los empates de nombre o de
 * fecha quedan en orden de posición, como el sitio.
 */
export function filterAdminProducts<T extends AdminListProduct>(
  products: readonly T[],
  filters: AdminFilters,
): T[] {
  const filtrados = products.filter((product) => {
    if (
      (filters.status === "publicados" && product.status !== "published") ||
      (filters.status === "retirados" && product.status !== "retired")
    ) {
      return false;
    }
    if (filters.category !== "todas" && product.category !== filters.category) {
      return false;
    }
    if (filters.featuredOnly && !product.featured) {
      return false;
    }
    return matchesSearchText(product, filters.search);
  });

  switch (filters.order) {
    case "nombre":
      return filtrados.sort((a, b) => {
        const comparacion = compararSinAcentos(a.name, b.name);
        return comparacion !== 0 ? comparacion : a.position - b.position;
      });
    case "editados":
      return filtrados.sort((a, b) => {
        const diferencia = epochDe(b.updatedAt) - epochDe(a.updatedAt);
        return diferencia !== 0 ? diferencia : a.position - b.position;
      });
    default:
      return filtrados.sort((a, b) => a.position - b.position);
  }
}

/**
 * URL de la lista (/admin) con SOLO los parámetros no-default: la vista
 * por defecto es "/admin" pelado y cada filtro activo se ve en la URL.
 * Los chips y el buscador navegan a URLs que arma esta función — no hay
 * estado de cliente que sincronizar.
 *
 * Los espacios de `q` se codifican como %20 (URLSearchParams emite "+",
 * que también decodifica bien, pero %20 es lo que produce un formulario
 * GET y se lee más limpio en la barra de direcciones).
 */
export function adminProductsHref(filters: AdminFilters): string {
  const params = new URLSearchParams();
  if (filters.search !== "") {
    params.set("q", filters.search);
  }
  if (filters.status !== "todos") {
    params.set("estado", filters.status);
  }
  if (filters.category !== "todas") {
    params.set("categoria", filters.category);
  }
  if (filters.featuredOnly) {
    params.set("destacados", "1");
  }
  if (filters.order !== "posicion") {
    params.set("orden", filters.order);
  }
  const query = params.toString();
  return query === "" ? "/admin" : `/admin?${query.replace(/\+/g, "%20")}`;
}

/**
 * ¿Hay algún filtro que OCULTE productos activo? (texto, estado,
 * categoría o destacados). Lo usan el contador ("3 de 15") y el enlace
 * "Limpiar filtros". El orden NO cuenta: reordenar la lista no es
 * filtrar — cambiarlo nunca oculta productos.
 *
 * El texto se normaliza igual que al matchear: un search de solo
 * espacios no oculta nada, así que tampoco cuenta como filtro activo.
 */
export function hasActiveFilters(filters: AdminFilters): boolean {
  return (
    normalizeSearchText(filters.search) !== "" ||
    filters.status !== "todos" ||
    filters.category !== "todas" ||
    filters.featuredOnly
  );
}
