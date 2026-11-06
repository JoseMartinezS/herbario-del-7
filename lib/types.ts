/**
 * Tipos y constantes de dominio del catálogo de Herbario Del 7.
 *
 * CATEGORIES es la fuente de verdad de los slugs de categoría; coincide con
 * las claves de CATEGORY_INFO y con la validación de lib/schema.ts.
 */

/** Slugs de categoría (también usados en las rutas del catálogo). */
export const CATEGORIES = [
  "veladoras",
  "hierbas-y-preparados",
  "aguas-y-riegos",
  "lociones",
  "capsulas-y-suplementos",
  "cuidado-personal",
  "sahumerios-e-inciensos",
] as const;

/** Unión de slugs de categoría válidos. */
export type Category = (typeof CATEGORIES)[number];

/** Etiqueta legible y descripción corta por categoría. */
export const CATEGORY_INFO: Record<
  Category,
  { name: string; description: string }
> = {
  veladoras: {
    name: "Veladoras",
    description:
      "Veladoras de 7 días y aromáticas para acompañar tus peticiones y devociones.",
  },
  "hierbas-y-preparados": {
    name: "Hierbas y preparados",
    description:
      "Hierbas frescas, tés y preparados tradicionales de la herbolaria mexicana.",
  },
  "aguas-y-riegos": {
    name: "Aguas y riegos",
    description:
      "Aguas aromáticas y de riego para limpiar y armonizar tus espacios.",
  },
  lociones: {
    name: "Lociones",
    description: "Lociones y aguas de tocador elaboradas con hierbas.",
  },
  "capsulas-y-suplementos": {
    name: "Cápsulas y suplementos",
    description: "Cápsulas y suplementos naturales para tu rutina diaria.",
  },
  "cuidado-personal": {
    name: "Cuidado personal",
    description:
      "Jabones, shampoos y productos naturales para piel y cabello.",
  },
  "sahumerios-e-inciensos": {
    name: "Sahumerios e Inciensos",
    description:
      "Copal, resinas e inciensos para sahumar la casa y acompañar tus peticiones.",
  },
};

/**
 * Producto del catálogo (una línea de producto del mostrador).
 *
 * - `description`: dos párrafos cortos separados por un salto de línea doble
 *   (`\n\n`), listos para renderizar con `whitespace-pre-line` o split.
 * - `image`: ruta pública de la imagen del producto — foto real
 *   (`.jpg`/`.jpeg`/`.webp`) o SVG de transición, p. ej.
 *   `/images/products/veladoras-parafina.jpg`.
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
  category: Category;
  price: number | null;
  image: string;
  /** Marca el producto para la sección de destacados del home. */
  featured?: boolean;
}
