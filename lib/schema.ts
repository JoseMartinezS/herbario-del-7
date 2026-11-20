import { z } from "zod";
import { CATEGORIES } from "./types";

/**
 * Esquema zod de Product — valida content/products.json al cargarlo.
 * Si el JSON se edita mal (slug mal formado, categoría inexistente, precio
 * negativo), el sitio falla en desarrollo con un error claro en vez de
 * renderizar contenido roto.
 */

/** kebab-case: minúsculas y números, separados por guiones. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Ruta pública de la imagen del producto: foto real (.jpg/.jpeg/.webp) o
 * ilustración SVG de transición, p. ej. /images/products/veladoras-parafina.jpg
 */
const IMAGE_REGEX =
  /^\/images\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:svg|jpe?g|webp)$/;

export const productSchema = z.object({
  slug: z
    .string()
    .regex(SLUG_REGEX, "El slug debe ir en kebab-case (minúsculas y guiones)."),
  name: z.string().min(1, "El nombre es obligatorio."),
  shortDescription: z
    .string()
    .min(1, "La descripción corta es obligatoria.")
    .max(140, "La descripción corta no debe pasar de 140 caracteres."),
  description: z
    .string()
    .min(1, "La descripción es obligatoria.")
    .refine(
      (value) => value.includes("\n\n"),
      "La descripción debe tener dos párrafos separados por un salto de línea doble (\\n\\n).",
    ),
  category: z.enum(CATEGORIES),
  price: z
    .number()
    .int("El precio debe ser un número entero de pesos (MXN).")
    .min(0, "El precio no puede ser negativo.")
    .nullable(),
  image: z
    .string()
    .regex(
      IMAGE_REGEX,
      "La imagen debe ser un archivo .svg, .jpg, .jpeg o .webp dentro de /images/products/.",
    ),
  featured: z.boolean().optional(),
});

/** Esquema del catálogo completo (content/products.json). */
export const productArraySchema = z.array(productSchema);
