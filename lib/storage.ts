/**
 * Helpers PUROS del bucket público `products` de Supabase Storage (F2.3).
 *
 * Una sola fuente de verdad para las reglas del bucket (declaradas en
 * supabase/migration.sql): mimes permitidos, tamaño máximo por archivo y
 * el formato de la URL pública. Las usa el cliente (validar la foto al
 * elegirla) y las Server Actions (armar el nombre del archivo, validar
 * la subida y decidir qué objeto viejo se borra al reemplazar foto).
 *
 * Sin dependencias de framework: importable desde componentes cliente y
 * desde el servidor, y testeable con Vitest sin red.
 */

/** Bucket público de las fotos del catálogo (id exacto del migration.sql). */
export const PRODUCTS_BUCKET = "products";

/**
 * Límite de tamaño por archivo del bucket: 10 MB (10485760 bytes,
 * file_size_limit del migration.sql). La validación se hace DOS veces:
 * en el navegador tras comprimir (mensaje inmediato) y en la Server
 * Action (nunca se confía en el cliente).
 */
export const MAX_IMAGE_BYTES = 10_485_760;

/**
 * Mimes que acepta el bucket (allowed_mime_types del migration.sql).
 * jpeg/png/webp entran por la foto del teléfono; svg es la ilustración
 * de transición.
 */
export const ALLOWED_IMAGE_MIMES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

/** ¿El mime está entre los que el bucket acepta? */
export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.includes(mime);
}

/** Extensión de archivo para un mime permitido (null si no aplica). */
export function extensionFromMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return null;
  }
}

/**
 * Nombre versionado del archivo en el bucket: {slug}-{timestamp}.{ext}.
 *
 * El timestamp rompe la caché del CDN al reemplazar la foto (URL nueva
 * = descarga nueva, sin encontrarnos con la foto vieja del visitante)
 * y evita colisiones entre productos y entre reemplazos.
 */
export function buildStorageFileName(
  slug: string,
  timestamp: number,
  extension: string,
): string {
  return `${slug}-${timestamp}.${extension}`;
}

/**
 * URL pública del bucket para un archivo:
 * https://<proyecto>.supabase.co/storage/v1/object/public/products/<archivo>.
 * Esa URL exacta es la que se guarda en la columna `image` de la fila.
 */
export function buildPublicStorageUrl(
  supabaseUrl: string,
  fileName: string,
): string {
  return `${supabaseUrl}/storage/v1/object/public/${PRODUCTS_BUCKET}/${fileName}`;
}

/**
 * Extrae el nombre de archivo de NUESTRO bucket desde una URL de imagen,
 * o null si la URL NO apunta al bucket products de este proyecto.
 *
 * Es la guardilla del borrado al reemplazar foto: solo se borra un
 * objeto del storage cuando la imagen anterior es de NUESTRO bucket
 * (una URL externa o una ruta local de /public jamás se toca). También
 * rechaza nombres con "/" o ".." para no dejar que una URL rara se
 * convierta en un path traversal hacia el remove().
 */
export function extractStorageFileName(
  imageUrl: string,
  supabaseUrl: string,
): string | null {
  const prefix = `${supabaseUrl}/storage/v1/object/public/${PRODUCTS_BUCKET}/`;
  if (!imageUrl.startsWith(prefix)) {
    return null;
  }
  const fileName = imageUrl.slice(prefix.length);
  if (
    fileName.length === 0 ||
    fileName.length > 200 ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..")
  ) {
    return null;
  }
  return fileName;
}
