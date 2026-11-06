import productsData from "@/content/products.json";
import { productArraySchema } from "./schema";
import { CATEGORIES, CATEGORY_INFO } from "./types";
import type { Category, Product } from "./types";

/**
 * Capa de acceso al catálogo. Toda la UI lee los productos desde aquí;
 * nadie debería importar content/products.json directamente.
 *
 * El JSON se valida con el esquema zod (lib/schema.ts) una sola vez,
 * de forma lazy: el primer acceso parsea y cachea; los siguientes reutilizan.
 *
 * price: null se interpreta como "Consulta el precio por WhatsApp"
 * (hoy todo el catálogo se publica así; cargar el número al confirmarlo).
 */

let productsCache: Product[] | null = null;

/** Valida products.json (una sola vez) y devuelve el catálogo tipado. */
function getCatalog(): Product[] {
  if (productsCache === null) {
    productsCache = productArraySchema.parse(productsData);
  }
  return productsCache;
}

/** Catálogo completo, en el orden del JSON. */
export function getProducts(): Product[] {
  return getCatalog();
}

/** Busca un producto por su slug (undefined si no existe). */
export function getProductBySlug(slug: string): Product | undefined {
  return getCatalog().find((product) => product.slug === slug);
}

/** Productos de una categoría, en el orden del JSON. */
export function getProductsByCategory(category: Category): Product[] {
  return getCatalog().filter((product) => product.category === category);
}

/** Productos marcados como destacados (para el home). */
export function getFeaturedProducts(): Product[] {
  return getCatalog().filter((product) => product.featured === true);
}

/**
 * Categorías con su etiqueta legible y número de productos.
 * Solo incluye categorías con al menos un producto (una categoría vacía no
 * tiene sentido en la navegación del catálogo).
 */
export function getCategoriesWithCounts(): Array<{
  category: Category;
  name: string;
  count: number;
}> {
  const catalog = getCatalog();
  return CATEGORIES.map((category) => ({
    category,
    name: CATEGORY_INFO[category].name,
    count: catalog.filter((product) => product.category === category).length,
  })).filter((entry) => entry.count > 0);
}
