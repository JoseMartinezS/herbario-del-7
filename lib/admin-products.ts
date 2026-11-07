import { isProductRow, type ProductRow } from "./supabase-catalog";
import { createSupabaseAuthClient } from "./supabase-auth-server";
import { isCategory } from "./types";
import type { Category } from "./types";
import type { ProductStatus } from "./admin-schema";

/**
 * Capa de datos del PANEL (F2.3): lectura de TODAS las filas (published
 * y retired) para la lista y la edición, más los cálculos de creación.
 *
 * A diferencia del catálogo público (lib/supabase-catalog.ts, que filtra
 * retired y cae al JSON local si Supabase falla), acá:
 *
 * - se lee con el CLIENTE AUTENTICADO (@supabase/ssr con las cookies de
 *   sesión): es la lectura "del panel" y quedaría bien si mañana la
 *   policy SELECT pública se cierra o filtra status,
 * - retired es un estado NORMAL (el panel lo ve y lo edita: retirar es
 *   reversible), no un error a esconder,
 * - sin fallback: si la base no responde, el error sube y la página del
 *   panel lo muestra con un mensaje claro y un reintento. El catálogo
 *   público NUNCA se entera: su fallback es asunto de lib/products.ts.
 *
 * Solo para código del servidor (usa cookies de sesión): Server
 * Components de /admin y Server Actions. La parte PURA (mapeo de filas,
 * cálculo de posición) está exportada y testeada con Vitest.
 */

/** Columnas exactas que pide el panel (el contrato de la respuesta). */
const ADMIN_PRODUCTS_SELECT = [
  "id",
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

/**
 * Fila del panel: la misma ProductRow del catálogo + `id` (el panel
 * edita por id, no por slug) y con el status acotado al unión real.
 */
export interface AdminProductRow extends Omit<ProductRow, "status"> {
  id: string;
  status: ProductStatus;
}

/** Producto tal como lo muestra el panel (camelCase, con id y estado). */
export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: Category;
  price: number | null;
  image: string;
  featured: boolean;
  status: ProductStatus;
  position: number;
}

/**
 * Validación estructural de una fila del panel: la misma de
 * isProductRow (supabase-catalog) + id presente + status en el unión.
 */
export function isAdminProductRow(row: unknown): row is AdminProductRow {
  if (!isProductRow(row)) {
    return false;
  }
  const rowWithId = row as ProductRow & Record<string, unknown>;
  return (
    typeof rowWithId.id === "string" &&
    rowWithId.id.length > 0 &&
    (row.status === "published" || row.status === "retired")
  );
}

/**
 * Mapea una fila VALIDADA a AdminProduct (snake → camel).
 * Devuelve null solo si la categoría no es de las 7 (lo demás ya quedó
 * garantizado por isAdminProductRow).
 */
export function mapRowToAdminProduct(
  row: AdminProductRow,
): AdminProduct | null {
  if (!isCategory(row.category)) {
    return null;
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description,
    category: row.category,
    price: row.price,
    image: row.image,
    featured: row.featured,
    status: row.status,
    position: row.position,
  };
}

/**
 * Posición del próximo producto: MAX(position) + 1 (la columna no tiene
 * default y el dueño jamás la toca — la action la calcula al crear).
 * Con la tabla vacía arranca en 1.
 */
export function calculateNextPosition(positions: number[]): number {
  if (positions.length === 0) {
    return 1;
  }
  return Math.max(...positions) + 1;
}

/**
 * Toda la tabla para el panel, ordenada por position (como el sitio).
 * Las filas malformadas se descartan con warn — una fila mala no puede
 * tumbar el panel entero — pero a diferencia del catálogo público NO se
 * filtran las retired: el panel las muestra (retirar es reversible).
 */
export async function listAdminProducts(): Promise<AdminProduct[]> {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCTS_SELECT)
    .order("position", { ascending: true });
  if (error !== null) {
    throw new Error(
      `no pudimos leer el catálogo (GET products: ${error.message})`,
    );
  }
  const products: AdminProduct[] = [];
  for (const [index, row] of (data as unknown[]).entries()) {
    if (!isAdminProductRow(row)) {
      console.warn(
        `[panel] fila #${index + 1} ignorada: no pasa la validación (revisa la tabla en el dashboard).`,
      );
      continue;
    }
    const product = mapRowToAdminProduct(row);
    if (product === null) {
      console.warn(
        `[panel] fila "${row.slug}" ignorada: categoría "${row.category}" fuera de las 7 del sitio.`,
      );
      continue;
    }
    products.push(product);
  }
  return products;
}

/** ¿Un id con forma de UUID? (PostgREST revienta si no, mejor ni pedir.) */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Una fila por id (para la página de edición).
 * null si el id no es un UUID o la fila no existe; Error si la red falla.
 */
export async function getAdminProductById(
  id: string,
): Promise<AdminProduct | null> {
  if (!isUuid(id)) {
    return null;
  }
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCTS_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error !== null) {
    throw new Error(
      `no pudimos leer el producto (GET products/${id}: ${error.message})`,
    );
  }
  if (data === null || !isAdminProductRow(data)) {
    return null;
  }
  return mapRowToAdminProduct(data);
}

/** ¿Ya existe una fila con ese slug? (chequeo de colisión al crear). */
export async function slugExists(slug: string): Promise<boolean> {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error !== null) {
    throw new Error(
      `no pudimos verificar el nombre (GET products?slug=…: ${error.message})`,
    );
  }
  return data !== null;
}

/** MAX(position)+1 contra la tabla real (la usa createProductAction). */
export async function getNextPosition(): Promise<number> {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase
    .from("products")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error !== null) {
    throw new Error(
      `no pudimos leer las posiciones (GET products: ${error.message})`,
    );
  }
  const positions = data === null ? [] : [data.position as number];
  return calculateNextPosition(positions);
}
