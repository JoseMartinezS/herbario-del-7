import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_MIMES,
  buildPublicStorageUrl,
  buildStorageFileName,
  extensionFromMime,
  extractStorageFileName,
  isAllowedImageMime,
  MAX_IMAGE_BYTES,
  PRODUCTS_BUCKET,
} from "./storage";

/**
 * Tests de los helpers del bucket de Storage (F2.3): el formato de la
 * URL pública, el nombre versionado y — lo más delicado — la guardilla
 * que decide qué objeto se puede borrar al reemplazar una foto.
 */

const SUPABASE_URL = "https://mmvifyolydrohrfffqtl.supabase.co";
const URL_PUBLICA = `${SUPABASE_URL}/storage/v1/object/public/products`;

describe("constantes del bucket", () => {
  it("deberían reflejar el migration.sql (bucket, mimes y límite)", () => {
    expect(PRODUCTS_BUCKET).toBe("products");
    expect(MAX_IMAGE_BYTES).toBe(10_485_760); // 10 MB exactos del bucket
    expect(ALLOWED_IMAGE_MIMES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ]);
  });
});

describe("isAllowedImageMime", () => {
  it("debería aceptar exactamente los 4 mimes del bucket", () => {
    expect(isAllowedImageMime("image/jpeg")).toBe(true);
    expect(isAllowedImageMime("image/png")).toBe(true);
    expect(isAllowedImageMime("image/webp")).toBe(true);
    expect(isAllowedImageMime("image/svg+xml")).toBe(true);
  });

  it("debería rechazar todo lo demás (gif, bmp, octet-stream, vacío)", () => {
    expect(isAllowedImageMime("image/gif")).toBe(false);
    expect(isAllowedImageMime("image/bmp")).toBe(false);
    expect(isAllowedImageMime("application/octet-stream")).toBe(false);
    expect(isAllowedImageMime("")).toBe(false);
    expect(isAllowedImageMime("image/svg")).toBe(false); // falta el +xml
  });
});

describe("extensionFromMime", () => {
  it("debería mapear cada mime permitido a su extensión de archivo", () => {
    expect(extensionFromMime("image/jpeg")).toBe("jpg");
    expect(extensionFromMime("image/png")).toBe("png");
    expect(extensionFromMime("image/webp")).toBe("webp");
    expect(extensionFromMime("image/svg+xml")).toBe("svg");
  });

  it("debería devolver null para mimes que el bucket no acepta", () => {
    expect(extensionFromMime("image/gif")).toBeNull();
    expect(extensionFromMime("")).toBeNull();
  });
});

describe("buildStorageFileName", () => {
  it("debería armar {slug}-{timestamp}.{ext}", () => {
    expect(buildStorageFileName("copal-blanco", 1731000000000, "webp")).toBe(
      "copal-blanco-1731000000000.webp",
    );
    expect(buildStorageFileName("hierbas", 1000, "svg")).toBe("hierbas-1000.svg");
  });
});

describe("buildPublicStorageUrl", () => {
  it("debería armar la URL pública exacta del bucket", () => {
    expect(
      buildPublicStorageUrl(SUPABASE_URL, "copal-blanco-1731000000000.webp"),
    ).toBe(`${URL_PUBLICA}/copal-blanco-1731000000000.webp`);
  });

  it("debería respetar la URL base sin tocar slashes (ya viene normalizada)", () => {
    expect(buildPublicStorageUrl("https://otro.supabase.co", "a.webp")).toBe(
      "https://otro.supabase.co/storage/v1/object/public/products/a.webp",
    );
  });
});

describe("extractStorageFileName (la guardilla del borrado)", () => {
  it("debería extraer el archivo de una URL de NUESTRO bucket", () => {
    expect(
      extractStorageFileName(
        `${URL_PUBLICA}/veladoras-preparadas.jpg`,
        SUPABASE_URL,
      ),
    ).toBe("veladoras-preparadas.jpg");
    expect(
      extractStorageFileName(
        `${URL_PUBLICA}/copal-blanco-1731000000000.webp`,
        SUPABASE_URL,
      ),
    ).toBe("copal-blanco-1731000000000.webp");
  });

  it("NO debería extraer nada de una ruta local del repo (/public)", () => {
    expect(
      extractStorageFileName("/images/products/veladoras-parafina.jpg", SUPABASE_URL),
    ).toBeNull();
  });

  it("NO debería extraer nada de una URL de OTRO proyecto de Supabase", () => {
    expect(
      extractStorageFileName(
        "https://otro-proyecto.supabase.co/storage/v1/object/public/products/foto.webp",
        SUPABASE_URL,
      ),
    ).toBeNull();
  });

  it("NO debería extraer nada de una URL externa cualquiera", () => {
    expect(
      extractStorageFileName("https://cdn.ejemplo.com/foto.webp", SUPABASE_URL),
    ).toBeNull();
    expect(extractStorageFileName("https://herbariodel7.com/foto.webp", SUPABASE_URL)).toBeNull();
  });

  it("NO debería extraer nada de OTRO bucket del mismo proyecto", () => {
    expect(
      extractStorageFileName(
        `${SUPABASE_URL}/storage/v1/object/public/otros/foto.webp`,
        SUPABASE_URL,
      ),
    ).toBeNull();
  });

  it("debería rechazar nombres vacíos, con slash o con path traversal", () => {
    expect(extractStorageFileName(`${URL_PUBLICA}/`, SUPABASE_URL)).toBeNull();
    expect(
      extractStorageFileName(`${URL_PUBLICA}/carpeta/foto.webp`, SUPABASE_URL),
    ).toBeNull();
    expect(
      extractStorageFileName(`${URL_PUBLICA}/..%2Fsecreto`, SUPABASE_URL),
    ).toBeNull(); // el nombre crudo contiene caracteres de traversal
    expect(
      extractStorageFileName(`${URL_PUBLICA}/../foto.webp`, SUPABASE_URL),
    ).toBeNull();
  });
});
