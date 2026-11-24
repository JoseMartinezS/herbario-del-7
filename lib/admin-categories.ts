import { z } from "zod";
import { isValidSlug } from "./slugify";
import { createSupabaseAuthClient } from "./supabase-auth-server";

/**
 * Capa de datos y validación del CRUD de CATEGORÍAS del panel (F2.5, F4).
 *
 * Espejo de lib/admin-products.ts, adaptado a una tabla chiquita con
 * clave pública (slug, sin id ni updated_at):
 *
 * - PARTE PURA (testeable con Vitest, cero red): el esquema zod que valida
 *   nombre/descripción/posición en las Server Actions, la palabra reservada
 *   del slug, el cálculo de posición (MAX+1), el conteo de fichas por
 *   familia y los mensajes PRG del banner (?ok= / ?error=) — incluido el
 *   echo-back que re-llena el formulario tras un error.
 * - PARTE DE RED (delgada, con el cliente autenticado de
 *   lib/supabase-auth-server): colisión de slug, siguiente posición y el
 *   pre-check de fichas antes de borrar. Como en productos: nada de esto
 *   se testea con red — su contrato real lo cubre el E2E de protección y
 *   el smoke del dueño contra el panel.
 *
 * Por qué el slug no se acepta del cliente: es la PRIMARY KEY que las
 * fichas referencian por FK y la que viaja en las URLs (?categoria=…).
 * Nace de `slugify(nombre)` al crear y de ahí NO se toca (precedente del
 *   slug de producto: cambiarlo rompería URLs ya indexadas).
 */

/* ============================================================================
 * Validación zod (el gate de las actions, nunca se confía en el cliente)
 * ==========================================================================*/

/** Longitudes sanas de una familia: el nombre es una etiqueta corta
 *  ("Sahumerios e Inciensos" ya es la más larga de la semilla). */
export const NOMBRE_CATEGORIA_MAX = 80;

/** La descripción vive en la grilla del inicio: una línea, dos como mucho. */
export const DESCRIPCION_CATEGORIA_MAX = 300;

/** Tope de la posición editable: orden de exhibición, no un contador global. */
export const POSICION_CATEGORIA_MAX = 999;

const categoriaBaseSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre de la familia es obligatorio.")
    .max(
      NOMBRE_CATEGORIA_MAX,
      `El nombre no debe pasar de ${NOMBRE_CATEGORIA_MAX} caracteres.`,
    ),
  descripcion: z
    .string()
    .trim()
    .max(
      DESCRIPCION_CATEGORIA_MAX,
      `La descripción no debe pasar de ${DESCRIPCION_CATEGORIA_MAX} caracteres.`,
    ),
});

/** Alta: el dueño solo tipea nombre y descripción (el slug sale del nombre
 *  y la posición se calcula: MAX+1). */
export const categoriaCreateSchema = categoriaBaseSchema;

/** Edición: nombre, descripción y posición (el slug JAMÁS se acepta). */
export const categoriaEditSchema = categoriaBaseSchema.extend({
  posicion: z
    .number()
    .int("La posición debe ser un número entero.")
    .min(1, "La posición arranca en 1.")
    .max(
      POSICION_CATEGORIA_MAX,
      `La posición máxima es ${POSICION_CATEGORIA_MAX}.`,
    ),
});

/* ============================================================================
 * Slugs y posición (puro)
 * ==========================================================================*/

/** Palabra reservada del default de los filtros (catálogo y panel): jamás
 *  puede ser el slug de una familia real — colisionaría con "ver todas". */
const SLUG_RESERVADO = "todas";

/**
 * ¿Slug aceptable como clave de una familia? No vacío, kebab-case bien
 * formado y ≠ "todas". Lo usan las actions al crear (sobre el slug que
 * ELLAS generan con slugify: doble gate a propósito) y los tests para fijar
 * el contrato de la palabra reservada.
 */
export function slugDeCategoriaValido(slug: string): boolean {
  return slug !== "" && slug !== SLUG_RESERVADO && isValidSlug(slug);
}

/**
 * Posición de la próxima familia: MAX(posicion)+1. Con la tabla vacía
 * arranca en 1 (espejo de calculateNextPosition de admin-products).
 */
export function calcularSiguientePosicion(posiciones: number[]): number {
  if (posiciones.length === 0) {
    return 1;
  }
  return Math.max(...posiciones) + 1;
}

/* ============================================================================
 * Conteo de fichas por familia (puro: lo arma la lista del panel)
 * ==========================================================================*/

/** Fichas publicadas/retiradas de una familia (retirar es reversible y la
 *  eliminación de familias las cuenta igual: la FK no distingue). */
interface ConteoCategoria {
  publicados: number;
  retirados: number;
}

/**
 * Cuenta las fichas por categoría (publicadas y retiradas separados).
 * Puro sobre la lista que ya cargó el panel — cero queries extra.
 */
export function contarProductosPorCategoria(
  productos: ReadonlyArray<{
    category: string;
    status: "published" | "retired";
  }>,
): Map<string, ConteoCategoria> {
  const conteos = new Map<string, ConteoCategoria>();
  for (const producto of productos) {
    const actual =
      conteos.get(producto.category) ?? { publicados: 0, retirados: 0 };
    if (producto.status === "published") {
      actual.publicados += 1;
    } else {
      actual.retirados += 1;
    }
    conteos.set(producto.category, actual);
  }
  return conteos;
}

/**
 * Texto del conteo de la fila: "3 productos · 1 retirado". Sin fichas se
 * dice claro ("Sin productos") — es la única familia que se puede borrar.
 */
export function textoDeConteo(publicados: number, retirados: number): string {
  const total = publicados + retirados;
  if (total === 0) {
    return "Sin productos";
  }
  const base = `${total} ${total === 1 ? "producto" : "productos"}`;
  return retirados > 0
    ? `${base} · ${retirados} ${retirados === 1 ? "retirado" : "retirados"}`
    : base;
}

/* ============================================================================
 * Mensajes PRG del banner (?ok= / ?error=) — el "0 JS" de los formularios
 * ==========================================================================*/

/**
 * Las actions de categorías no devuelven errores: REDIRIGEN con claves en
 * la URL (patrón PRG) y la página traduce la clave a mensaje. Basura en la
 * URL → mensaje null (allowlist, como MENSAJES_OK en /admin).
 */

const MENSAJES_OK_CATEGORIAS: Record<string, string> = {
  creada: "Familia creada: ya se ve en el catálogo y en el formulario de producto.",
  guardada: "Cambios guardados: el sitio se actualiza al refrescarlo.",
  eliminada: "Familia eliminada del catálogo.",
};

const MENSAJES_ERROR_CATEGORIAS: Record<string, string> = {
  "sin-config":
    "El acceso al panel no está configurado en este entorno. Revisa las variables de entorno de Supabase del proyecto.",
  "datos-invalidos": `Algún dato no pasa la validación: nombre obligatorio (hasta ${NOMBRE_CATEGORIA_MAX} caracteres), descripción hasta ${DESCRIPCION_CATEGORIA_MAX}, posición entera desde 1.`,
  "sin-slug":
    "El nombre necesita letras o números para crear la dirección de la familia.",
  reservada:
    "«Todas» es una palabra reservada del catálogo: elige otro nombre.",
  duplicado: "Ya existe una familia con ese nombre — prueba otro nombre.",
  "no-guardado":
    "No pudimos guardar la familia. Inténtalo de nuevo en unos minutos.",
  "no-existe":
    "Esa familia ya no existe en el catálogo. Vuelve a la lista y recarga.",
  red: "No pudimos conectar con el catálogo. Revisa tu conexión e inténtalo de nuevo.",
};

/** Claves válidas de ?error=: el mapa estático + la compuesta (ver abajo). */
const CLAVES_ERROR_CATEGORIAS = new Set([
  ...Object.keys(MENSAJES_ERROR_CATEGORIAS),
  "con-productos",
]);

/**
 * El mensaje de "con-productos" se COMPONE en la página (no es estático):
 * dice qué familia y cuántas fichas. Sin conteo (carrera: la DB rechazó el
 * DELETE con FK y el pre-check ya no sirve) se dice lo mismo sin cifra.
 */
function mensajeConProductos(slug: string, productos: number | null): string {
  const quien = slug === "" ? "Esa familia" : `«${slug}»`;
  if (productos === null) {
    return `${quien} todavía tiene productos asignados (incluyendo retirados). Muévelos o elimínalos primero.`;
  }
  return `${quien} tiene ${productos} ${productos === 1 ? "producto" : "productos"} (incluyendo retirados). Muévelos o elimínalos primero.`;
}

/** Toma el primer valor de un parámetro (por si viene repetido). */
function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Banner ?ok= de las páginas de categorías: la clave debe estar en el
 * allowlist; cualquier basura en la URL se ignora (null, sin banner).
 */
export function mensajeOkDesdeParams(
  params: Record<string, string | string[] | undefined>,
): string | null {
  const clave = primerValor(params.ok);
  if (clave === undefined) {
    return null;
  }
  return MENSAJES_OK_CATEGORIAS[clave] ?? null;
}

/**
 * Banner ?error= de las páginas de categorías: allowlist de claves y,
 * para "con-productos", composición con el slug y el conteo que la action
 * llevó en la URL. El conteo se re-valida (solo enteros positivos).
 */
export function mensajeErrorDesdeParams(
  params: Record<string, string | string[] | undefined>,
): string | null {
  const clave = primerValor(params.error);
  if (clave === undefined || !CLAVES_ERROR_CATEGORIAS.has(clave)) {
    return null;
  }
  if (clave === "con-productos") {
    const slug = (primerValor(params.slug) ?? "").slice(0, 100);
    const crudo = primerValor(params.productos);
    const productos =
      crudo !== undefined && /^\d+$/.test(crudo) && Number(crudo) > 0
        ? Number(crudo)
        : null;
    return mensajeConProductos(slug, productos);
  }
  return MENSAJES_ERROR_CATEGORIAS[clave] ?? null;
}

/* ============================================================================
 * Echo-back del formulario (puro)
 * ==========================================================================*/

/**
 * Lo que la persona había escrito, de vuelta a los inputs: las actions de
 * error redirigen con `?nombre=…&descripcion=…&posicion=…` para que el
 * formulario plano (0 JS) no pierda lo tipeado. Sin error en la URL las
 * páginas usan los valores guardados — el eco SOLO manda con ?error=.
 *
 * Los topes son los mismos del zod: una URL gigante no entra al render.
 */
export interface EchoCategoria {
  nombre: string;
  descripcion: string;
  posicion: string;
}

export function echoCategoriaDesdeParams(
  params: Record<string, string | string[] | undefined>,
): EchoCategoria {
  return {
    nombre: (primerValor(params.nombre) ?? "").slice(0, NOMBRE_CATEGORIA_MAX),
    descripcion: (primerValor(params.descripcion) ?? "").slice(
      0,
      DESCRIPCION_CATEGORIA_MAX,
    ),
    posicion: (primerValor(params.posicion) ?? "").slice(0, 8),
  };
}

/* ============================================================================
 * Lecturas con el cliente autenticado (espejo de lib/admin-products.ts)
 * ==========================================================================*/

/** ¿Ya existe una familia con ese slug? (chequeo de colisión al crear.) */
export async function existeCategoria(slug: string): Promise<boolean> {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error !== null) {
    throw new Error(
      `no pudimos verificar la familia (GET categories?slug=…: ${error.message})`,
    );
  }
  return data !== null;
}

/**
 * MAX(posicion)+1 contra la tabla real (espejo de getNextPosition de
 * productos): la posición de una familia nueva se calcula, no se tipea.
 */
export async function siguientePosicionDeCategoria(): Promise<number> {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase
    .from("categories")
    .select("posicion")
    .order("posicion", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error !== null) {
    throw new Error(
      `no pudimos leer las posiciones (GET categories: ${error.message})`,
    );
  }
  return calcularSiguientePosicion(
    data === null ? [] : [data.posicion as number],
  );
}

/**
 * Total de fichas que usan la familia (publicadas y retiradas: la FK
 * ON DELETE RESTRICT no distingue, el pre-check tampoco). Lo usa
 * eliminarCategoriaAction antes del DELETE.
 */
export async function contarProductosDeCategoria(slug: string): Promise<number> {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase
    .from("products")
    .select("status")
    .eq("category", slug);
  if (error !== null) {
    throw new Error(
      `no pudimos leer las fichas de la familia (GET products?category=…: ${error.message})`,
    );
  }
  return (data as unknown[]).length;
}
