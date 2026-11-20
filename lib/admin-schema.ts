import { z } from "zod";
import { productSchema } from "./schema";

/**
 * Esquema zod del producto EDITABLE desde el panel (F2.3).
 *
 * REUTILIZA los mismos gates del catálogo (lib/schema.ts) vía .extend():
 * name obligatorio, shortDescription ≤ 140, description en dos párrafos,
 * categoría de las 7, precio entero ≥ 0 o null. Lo único que se AMPLÍA
 * es `image` (el panel acepta la ruta local del JSON original Y la URL
 * absoluta del bucket de Storage — el sitio es dual-mode) y lo que se
 * SUMA es `status` (publicado/retirado) y `featured` obligatorio (en la
 * tabla es boolean not null; el schema del JSON lo trae opcional).
 *
 * Este schema valida en la SERVER ACTION, sobre los valores ya compuestos
 * (nunca se confía en el cliente): es el último gate antes de tocar la
 * tabla. El formulario cliente tiene su propio schema de campos libres
 * (el precio se tipea, la imagen es un archivo) pero los mensajes y los
 * límites son los mismos.
 */

/** Estados de una ficha: publicado (visible) o retirado (reversible). */
const PRODUCT_STATUSES = ["published", "retired"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Ruta local del JSON original (la misma regex de lib/schema.ts). */
const LOCAL_IMAGE_REGEX =
  /^\/images\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:svg|jpe?g|webp)$/;

/** URL pública del bucket products de NUESTRO proyecto de Supabase
 * (https en producción; http://localhost con puerto para el CLI local). */
const STORAGE_IMAGE_REGEX =
  /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?\/storage\/v1\/object\/public\/products\/[A-Za-z0-9._-]+$/;

/** El precio es numeric(10,2) en la tabla: techo 99,999,999 pesos. */
export const MAX_PRICE = 99_999_999;

/** Esquema de la imagen del panel: ruta local o URL del bucket propio. */
const panelImageSchema = z
  .string()
  .min(1, "La foto es obligatoria.")
  .refine(
    (value) => LOCAL_IMAGE_REGEX.test(value) || STORAGE_IMAGE_REGEX.test(value),
    "La foto del producto debe ser una imagen del catálogo (JPG, PNG, WebP o SVG).",
  );

/**
 * Producto completo tal como lo escribe el panel. La unión de gates:
 * los del catálogo público + estado + imagen dual-mode.
 *
 * Nota zod 4: .omit() no se puede aplicar sobre un schema con
 * refinements, así que el .refine del precio vive en adminProductSchema
 * (el completo) y adminProductFieldsSchema se deriva de la base PURA.
 */
const adminProductBase = productSchema.extend({
  image: panelImageSchema,
  featured: z.boolean(),
  status: z.enum(PRODUCT_STATUSES),
});

/** Campos de texto/valores que llegan del form (sin imagen ni estado). */
export const adminProductFieldsSchema = adminProductBase.omit({
  image: true,
  status: true,
});

export const adminProductSchema = adminProductBase.refine(
  (value) => value.price === null || value.price <= MAX_PRICE,
  { message: "El precio máximo es $99,999,999.", path: ["price"] },
);
