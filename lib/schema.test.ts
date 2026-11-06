import { describe, expect, it } from "vitest";
import { productSchema } from "./schema";
import type { Product } from "./types";

/**
 * Tests del esquema zod de Product (guardián de content/products.json).
 *
 * El dueño edita seguido el JSON del catálogo; estas reglas documentan lo que
 * un producto debe cumplir para que el sitio cargue sin romper el render.
 */

/** Producto REAL del catálogo (copiado de content/products.json). */
const veladorasPreparadas = {
  slug: "veladoras-preparadas",
  name: "Veladoras Preparadas",
  shortDescription:
    "Veladoras ya preparadas con hierbas y esencias para una intención específica.",
  description:
    "Las veladoras preparadas llegan listas para encenderse: vienen cargadas con hierbas, esencias y oración según la intención —protección, amor, dinero, limpia— para que no tengas que vestirla tú. Preparar la veladora es una de las costumbres más antiguas del herbolario mexicano, y aquí se sigue haciendo a mano.\n\nCada preparación se arma en la casa con su hierba y su oración. Pregunta por WhatsApp qué veladoras preparadas hay disponibles hoy, o cuéntanos qué necesitas y te decimos cuál te sirve.",
  category: "veladoras",
  price: null,
  image: "/images/products/veladoras-preparadas.jpg",
  featured: true,
} satisfies Product;

/** Corre safeParse y valida que rechace POR EL CAMPO indicado (no por otro). */
function expectRejected(input: unknown, field: string): void {
  const result = productSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join("."));
    expect(fields).toContain(field);
  }
}

describe("productSchema", () => {
  it("debería aceptar un producto real del catálogo", () => {
    const result = productSchema.parse(veladorasPreparadas);
    expect(result).toEqual(veladorasPreparadas);
  });

  it("debería rechazar una categoría inexistente", () => {
    expectRejected({ ...veladorasPreparadas, category: "tes" }, "category");
  });

  it("debería rechazar un slug mal formado (espacios y mayúsculas)", () => {
    expectRejected({ ...veladorasPreparadas, slug: "Veladora Blanca" }, "slug");
  });

  it("debería aceptar price null (consulta por WhatsApp) y enteros >= 0", () => {
    expect(productSchema.parse(veladorasPreparadas).price).toBeNull();
    expect(productSchema.parse({ ...veladorasPreparadas, price: 45 }).price).toBe(45);
    expect(productSchema.parse({ ...veladorasPreparadas, price: 0 }).price).toBe(0);
  });

  it("debería rechazar un price negativo o con decimales", () => {
    expectRejected({ ...veladorasPreparadas, price: -1 }, "price");
    expectRejected({ ...veladorasPreparadas, price: 45.5 }, "price");
  });

  it("debería rechazar una descripción de un solo párrafo (sin \\n\\n)", () => {
    expectRejected(
      {
        ...veladorasPreparadas,
        description:
          "Un solo párrafo largo que no trae el salto de línea doble que el sitio usa para separar los dos párrafos de la ficha del producto.",
      },
      "description",
    );
  });

  it("debería aceptar imágenes .jpg, .jpeg, .webp y .svg dentro de /images/products/", () => {
    for (const imagen of [
      "/images/products/veladoras-preparadas.jpg",
      "/images/products/veladoras-preparadas.jpeg",
      "/images/products/veladoras-preparadas.webp",
      "/images/products/veladoras-preparadas.svg",
    ]) {
      expect(
        productSchema.parse({ ...veladorasPreparadas, image: imagen }).image,
      ).toBe(imagen);
    }
  });

  it("debería rechazar una imagen fuera de /images/products/ o con extensión no soportada", () => {
    expectRejected(
      { ...veladorasPreparadas, image: "images/products/veladoras-preparadas.svg" },
      "image",
    );
    expectRejected(
      { ...veladorasPreparadas, image: "/images/products/veladora-blanca.png" },
      "image",
    );
    expectRejected(
      { ...veladorasPreparadas, image: "/images/products/veladoras-preparadas.JPG" },
      "image",
    );
  });
});
