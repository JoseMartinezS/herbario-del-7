/**
 * Preparación de la foto del producto EN EL NAVEGADOR (F2.3), antes de
 * mandarla a la Server Action.
 *
 * Por qué comprimir en el cliente: el plan free de Supabase no incluye
 * transforms de imagen, así que si la foto del teléfono (3–10 MB) sube
 * tal cual, el catálogo público se come ese peso en cada ficha. Con
 * canvas la foto llega liviana SIEMPRE: máx. 1200 px de lado mayor,
 * exportada a WebP calidad 0.8 (~100–300 KB típicos).
 *
 * SVG pasa tal cual: es vectorial, recomprimirlo no achica nada y el
 * canvas lo rasterizaría (peor calidad, más peso).
 *
 * Las decisiones puras (mime, escala, tamaño legible) viven aparte y
 * están testeadas en lib/image-upload.test.ts; la parte de canvas solo
 * existe en el navegador y la cubre el smoke del dueño.
 */

import { isAllowedImageMime, MAX_IMAGE_BYTES } from "./storage";

/** Lado mayor máximo de la foto exportada (px). */
export const MAX_IMAGE_DIMENSION = 1200;

/** Calidad del WebP exportado (0–1). */
const WEBP_QUALITY = 0.8;

/** Calidad del JPEG de reserva (si el navegador no exporta WebP). */
const JPEG_QUALITY = 0.85;

/** ¿Es la ilustración vectorial? (se sube tal cual, sin recomprimir). */
export function isVectorImage(mime: string): boolean {
  return mime === "image/svg+xml";
}

/**
 * Escala que respeta la proporción con tope en `max` por lado mayor.
 * Nunca agranda: una foto ya más chica que el tope sale igual.
 */
export function scaleDimensions(
  width: number,
  height: number,
  max: number = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width, height };
  }
  const longest = Math.max(width, height);
  if (longest <= max) {
    return { width, height };
  }
  const factor = max / longest;
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

/** Tamaño legible para mostrar ("247 KB", "1.4 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Errores en español claro, para mostrar inline en el formulario. */
function errorDePreparacion(mensaje: string): Error {
  return new Error(mensaje);
}

/** Carga una imagen raster en un <img> decodificado (EXIF orientado). */
function loadRasterImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(errorDePreparacion("No pudimos leer la foto. Probá con otra."));
    };
    img.src = url;
  });
}

/**
 * Prepara la foto para subir:
 *
 * - valida el mime (los 4 del bucket) y el tamaño final (10 MB del bucket),
 * - SVG: tal cual,
 * - JPEG/PNG/WebP: canvas → reescala a máx. 1200 px → WebP 0.8
 *   (si el navegador no exporta WebP, cae a JPEG 0.85 con fondo blanco),
 * - devuelve un File NUEVO con el mime real del resultado (la extensión
 *   la decide el server a partir de ese mime).
 *
 * Lanza Error con mensaje en español: el formulario lo muestra inline.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isAllowedImageMime(file.type)) {
    throw errorDePreparacion("La foto debe ser JPG, PNG, WebP o SVG.");
  }
  if (isVectorImage(file.type)) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw errorDePreparacion("La ilustración es muy pesada — probá otra.");
    }
    return file;
  }

  const img = await loadRasterImage(file);
  const objectUrl = img.src; // revocar al final, después de dibujar.
  try {
    const { width, height } = scaleDimensions(
      img.naturalWidth,
      img.naturalHeight,
    );

    // Primer intento: WebP (alfa incluida, mejor compresión).
    const webp = await exportFromCanvas(img, width, height, "image/webp", WEBP_QUALITY, false);
    if (webp !== null && webp.type === "image/webp") {
      return asUploadFile(webp, MAX_IMAGE_BYTES);
    }

    // Reserva para navegadores sin export WebP (iOS viejos): JPEG con
    // fondo blanco (el JPEG no tiene transparencia).
    const jpeg = await exportFromCanvas(img, width, height, "image/jpeg", JPEG_QUALITY, true);
    if (jpeg !== null) {
      return asUploadFile(jpeg, MAX_IMAGE_BYTES);
    }

    throw errorDePreparacion(
      "No pudimos preparar la foto en este navegador. Probá con otra imagen.",
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Dibuja la imagen en canvas al tamaño final y exporta el blob. */
async function exportFromCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
  mime: "image/webp" | "image/jpeg",
  quality: number,
  fondoBlanco: boolean,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return null;
  }
  if (fondoBlanco) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

/** valida el tope de tamaño del bucket y arma el File final. */
function asUploadFile(blob: Blob, techoBytes: number): File {
  if (blob.size > techoBytes) {
    throw errorDePreparacion("La foto es muy pesada — probá otra.");
  }
  return new File([blob], "foto", { type: blob.type });
}
