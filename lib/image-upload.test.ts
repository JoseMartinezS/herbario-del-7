import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  isVectorImage,
  MAX_IMAGE_DIMENSION,
  scaleDimensions,
} from "./image-upload";
import { MAX_IMAGE_BYTES } from "./storage";

/**
 * Tests de las decisiones PURAS de la preparación de fotos (F2.3):
 * escala con tope por lado mayor y formato legible del tamaño. La parte
 * de canvas (prepareImageForUpload) solo existe en el navegador y la
 * cubre el smoke del dueño contra el panel real.
 */

describe("isVectorImage", () => {
  it("debería marcar solo el SVG (pasa tal cual, sin recomprimir)", () => {
    expect(isVectorImage("image/svg+xml")).toBe(true);
    expect(isVectorImage("image/jpeg")).toBe(false);
    expect(isVectorImage("image/png")).toBe(false);
    expect(isVectorImage("image/webp")).toBe(false);
  });
});

describe("scaleDimensions", () => {
  it("debería achicar por el lado mayor respetando la proporción", () => {
    expect(scaleDimensions(2400, 1600)).toEqual({ width: 1200, height: 800 });
    expect(scaleDimensions(1600, 2400)).toEqual({ width: 800, height: 1200 });
    expect(scaleDimensions(1300, 1300)).toEqual({ width: 1200, height: 1200 });
  });

  it("NO debería agrandar fotos ya más chicas que el tope", () => {
    expect(scaleDimensions(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaleDimensions(1200, 1200)).toEqual({ width: 1200, height: 1200 });
    expect(scaleDimensions(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it("debería usar el tope por defecto de 1200 px y aceptar uno custom", () => {
    expect(MAX_IMAGE_DIMENSION).toBe(1200);
    expect(scaleDimensions(3000, 1000, 600)).toEqual({ width: 600, height: 200 });
  });

  it("debería degradar bien con dimensiones inválidas (0 o negativas)", () => {
    expect(scaleDimensions(0, 0)).toEqual({ width: 0, height: 0 });
    expect(scaleDimensions(-10, 400)).toEqual({ width: -10, height: 400 });
  });
});

describe("formatFileSize", () => {
  it("debería formatear B, KB y MB legibles para el dueño", () => {
    expect(formatFileSize(900)).toBe("900 B");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(252_000)).toBe("246 KB");
    expect(formatFileSize(1_500_000)).toBe("1.4 MB");
    // El techo del bucket se muestra en MB, no en KB gigantes.
    expect(formatFileSize(MAX_IMAGE_BYTES)).toBe("10.0 MB");
  });
});
