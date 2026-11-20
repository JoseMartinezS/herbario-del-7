/**
 * Paginación server-side de las listas del sitio (panel admin y catálogo).
 *
 * Funciones PURAS (sin React ni red): las páginas parsean el searchParam
 * `page`, lo acotan al rango real de la vista y rebanan la lista acá —
 * testeable con Vitest sin montar nada (misma convención que
 * lib/admin-filters.ts).
 *
 * Por qué EN MEMORIA y no en la base: ambas listas ya se filtran y
 * ordenan server-side sobre el catálogo completo (filterAdminProducts,
 * getProductsByCategory), y el catálogo tiene un modo fallback a JSON
 * local que una paginación en SQL rompería. Con el tamaño actual del
 * catálogo el costo es el mismo; cuando crezca de verdad se mide y se
 * refactora con datos.
 *
 * Contrato del parámetro `page` (convención no-defaults del repo):
 * - `page` viaja SOLO cuando vale más de 1: la primera página es la URL
 *   pelada, y los chips y la búsqueda de ambas páginas arman sus URLs
 *   sin page — cambiar cualquier filtro vuelve a la página 1 gratis.
 * - Cualquier basura (texto, cero, negativo, fracción, array raro) cae
 *   a 1, igual que parseAdminFilters ante un estado inventado.
 * - Un page más grande que la última página se ACOTA: la URL renderiza
 *   la última página válida en vez de una lista vacía — nadie mira un
 *   "sin coincidencias" falso por un link viejo.
 *
 * `page` queda FUERA de AdminFilters a propósito: el módulo firmado
 * (lib/admin-filters.ts) ignora parámetros desconocidos, así que este
 * searchParam pasa desapercibido por ahí y se parsea aparte en cada
 * página.
 */

/** Filas por página de la lista del panel (preferencia cerrada del dueño). */
export const ADMIN_POR_PAGINA = 12;

/** Tarjetas por página del catálogo: 6 filas × 3 en desktop, 9 × 2 en tablet. */
export const CATALOGO_POR_PAGINA = 18;

/** Toma el primer valor de un parámetro (por si viene repetido). */
function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Parsea el searchParam `page`: número entero ≥ 1, o 1 ante cualquier
 * basura (undefined, vacío, texto, cero, negativo, fracción, primer
 * valor de un array que no sirve). El rango superior NO se valida acá:
 * eso es cosa del clamp, que necesita saber cuántas páginas hay.
 */
export function parsePageParam(raw: string | string[] | undefined): number {
  const valor = primerValor(raw);
  if (valor === undefined) {
    return 1;
  }
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 ? numero : 1;
}

/**
 * Acota `page` al rango [1, totalPaginas]. Con totalPaginas 0 (lista
 * vacía) devuelve 1: la página inexistente no rompe el render — la
 * rebanada sale vacía y el estado "sin coincidencias" de cada página
 * hace su trabajo con la lista completa.
 */
export function clampPage(page: number, totalPaginas: number): number {
  const ultima = Math.max(totalPaginas, 1);
  return Math.min(Math.max(page, 1), ultima);
}

/** Resultado de paginar: la rebanada, el total y la página YA acotada. */
interface ResultadoPaginacion<T> {
  /** Items de la página acotada (array nuevo; la entrada no se toca). */
  itemsPagina: T[];
  /** Math.ceil(total / porPagina): 0 cuando la lista está vacía. */
  totalPaginas: number;
  /** La página acotada — es la que se renderiza y marca aria-current. */
  paginaActual: number;
}

/**
 * Rebana la lista para la página pedida, acotando ANTES del slice: un
 * `?page=99` en una vista de 3 páginas renderiza la página 3, no un
 * vacío falso. Por eso devuelve `paginaActual`: el nav marca como
 * activa la página que de verdad se ve, no la que pedía la URL.
 *
 * `porPagina` tiene piso de 1: un valor roto no fabrica páginas
 * infinitas (misma tolerancia silenciosa que parseAdminFilters).
 */
export function paginar<T>(
  items: readonly T[],
  page: number,
  porPagina: number,
): ResultadoPaginacion<T> {
  const tamanio = Math.max(1, Math.trunc(porPagina));
  const totalPaginas = Math.ceil(items.length / tamanio);
  const paginaActual = clampPage(page, totalPaginas);
  const inicio = (paginaActual - 1) * tamanio;
  return {
    itemsPagina: items.slice(inicio, inicio + tamanio),
    totalPaginas,
    paginaActual,
  };
}

/**
 * Arma el href de una página sobre la URL base de la vista (la que
 * devuelve adminProductsHref o el patrón inline del catálogo): `page`
 * se appendea con el separador correcto y SOLO viaja cuando vale más
 * de 1 — la primera página es la URL pelada (convención no-defaults).
 */
export function buildPageHref(baseHref: string, page: number): string {
  if (page <= 1) {
    return baseHref;
  }
  const separador = baseHref.includes("?") ? "&" : "?";
  return `${baseHref}${separador}page=${page}`;
}

/** Marca de elipsis en la ventana de números del nav ("acá faltan páginas"). */
export const SALTO_PAGINAS = "salto";

/**
 * Ventana de números del nav: con 7 páginas o menos se muestran todas;
 * después, primera + última + hasta 3 alrededor de la actual, con un
 * SALTO_PAGINAS donde faltan números. Máximo 5 cifras visibles
 * (primera y última incluidas): el nav no se vuelve una sopa de
 * píldoras ni con catálogos grandes.
 *
 * Precondición (la garantiza paginar): 1 ≤ actual ≤ totalPaginas.
 */
export function calcularPaginas(
  actual: number,
  totalPaginas: number,
): (number | typeof SALTO_PAGINAS)[] {
  const paginas: (number | typeof SALTO_PAGINAS)[] = [1];
  if (totalPaginas <= 7) {
    for (let p = 2; p <= totalPaginas; p += 1) {
      paginas.push(p);
    }
    return paginas;
  }
  const desde = Math.max(2, actual - 1);
  const hasta = Math.min(totalPaginas - 1, actual + 1);
  if (desde > 2) {
    paginas.push(SALTO_PAGINAS);
  }
  for (let p = desde; p <= hasta; p += 1) {
    paginas.push(p);
  }
  if (hasta < totalPaginas - 1) {
    paginas.push(SALTO_PAGINAS);
  }
  paginas.push(totalPaginas);
  return paginas;
}
