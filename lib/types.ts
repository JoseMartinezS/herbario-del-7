/**
 * Tipos y constantes de dominio del catálogo de Herbario Del 7.
 *
 * Desde F2.5 las categorías son DATOS dinámicos: content/categories.json
 * en modo local, tabla `categories` de Supabase en modo remoto (la fuente
 * es lib/categories.ts). CATEGORIES queda como la SEMILLA de referencia
 * —las 7 familias originales del mostrador— contra la que los tests fijan
 * la coherencia de los archivos; ya NO es la lista vigente en runtime.
 */

/** Slugs de las 7 categorías semilla (la lista vigente vive en datos). */
export const CATEGORIES = [
  "veladoras",
  "hierbas-y-preparados",
  "aguas-y-riegos",
  "lociones",
  "capsulas-y-suplementos",
  "cuidado-personal",
  "sahumerios-e-inciensos",
] as const;

/**
 * Unión de los slugs de la SEMILLA. No describe la realidad runtime
 * (puede haber categorías nuevas): es la llave de los estilos históricos
 * de la semilla en lib/categories.ts y la referencia de los tests.
 */
export type Category = (typeof CATEGORIES)[number];

/**
 * Categoría del catálogo tal como se lee de la fuente vigente
 * (categories.json o la tabla `categories` de Supabase).
 */
export interface Categoria {
  /** Slug kebab-case: el de la URL (?categoria=<slug>) y el de la FK. */
  slug: string;
  /** Etiqueta legible ("Veladoras"): la que se muestra en la UI. */
  nombre: string;
  /** Descripción corta para la grilla de familias del home. */
  descripcion: string;
  /** Orden de exhibición (1 = primera). */
  posicion: number;
}

/**
 * Producto del catálogo (una línea de producto del mostrador).
 *
 * - `description`: dos párrafos cortos separados por un salto de línea doble
 *   (`\n\n`), listos para renderizar con `whitespace-pre-line` o split.
 * - `image`: imagen del producto. En modo JSON local es una ruta pública
 *   (`.jpg`/`.jpeg`/`.webp` o SVG de transición, p. ej.
 *   `/images/products/veladoras-parafina.jpg`); en modo Supabase es la
 *   URL absoluta del bucket público de Storage. El JSON-LD y next/image
 *   soportan ambas formas (ver lib/product-schema.ts y next.config.ts).
 * - `price`: precio en pesos mexicanos (MXN). `null` significa
 *   "Consulta el precio por WhatsApp".
 *   TODO: cargar el número cuando el dueño confirme precios — hoy todo el
 *   catálogo se publica con `null`.
 */
export interface Product {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  /**
   * Slug de la categoría (dinámica desde F2.5): la membresía se valida
   * en runtime contra la lista vigente — la FK de la base en modo
   * remoto, la validación cruzada de lib/categories.ts en modo local.
   */
  category: string;
  price: number | null;
  image: string;
  /** Marca el producto para la sección de destacados del home. */
  featured?: boolean;
}
