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
const veladoraBlanca = {
  slug: "veladora-blanca-7-dias",
  name: "Veladora Blanca de 7 Días",
  shortDescription:
    "Vela blanca de larga duración para limpias, protección y devoción.",
  description:
    "La veladora blanca es la más versátil del herbolario: en la tradición mexicana se enciende tradicionalmente para limpias, protección y agradecimiento, y para acompañar peticiones de paz y armonía en el hogar.\n\nSu cera de combustión lenta está pensada para acompañarte durante los siete días de una petición o novena. Pregúntanos por la oración o el acompañamiento adecuado para tu intención.",
  category: "veladoras",
  price: null,
  image: "/images/products/veladora-blanca-7-dias.svg",
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
    const result = productSchema.parse(veladoraBlanca);
    expect(result).toEqual(veladoraBlanca);
  });

  it("debería rechazar una categoría inexistente", () => {
    expectRejected({ ...veladoraBlanca, category: "tes" }, "category");
  });

  it("debería rechazar un slug mal formado (espacios y mayúsculas)", () => {
    expectRejected({ ...veladoraBlanca, slug: "Veladora Blanca" }, "slug");
  });

  it("debería aceptar price null (consulta por WhatsApp) y enteros >= 0", () => {
    expect(productSchema.parse(veladoraBlanca).price).toBeNull();
    expect(productSchema.parse({ ...veladoraBlanca, price: 45 }).price).toBe(45);
    expect(productSchema.parse({ ...veladoraBlanca, price: 0 }).price).toBe(0);
  });

  it("debería rechazar un price negativo o con decimales", () => {
    expectRejected({ ...veladoraBlanca, price: -1 }, "price");
    expectRejected({ ...veladoraBlanca, price: 45.5 }, "price");
  });

  it("debería rechazar una descripción de un solo párrafo (sin \\n\\n)", () => {
    expectRejected(
      {
        ...veladoraBlanca,
        description:
          "Un solo párrafo largo que no trae el salto de línea doble que el sitio usa para separar los dos párrafos de la ficha del producto.",
      },
      "description",
    );
  });

  it("debería aceptar imágenes .jpg, .jpeg, .webp y .svg dentro de /images/products/", () => {
    for (const imagen of [
      "/images/products/veladora-blanca-7-dias.jpg",
      "/images/products/veladora-blanca-7-dias.jpeg",
      "/images/products/veladora-blanca-7-dias.webp",
      "/images/products/veladora-blanca-7-dias.svg",
    ]) {
      expect(
        productSchema.parse({ ...veladoraBlanca, image: imagen }).image,
      ).toBe(imagen);
    }
  });

  it("debería rechazar una imagen fuera de /images/products/ o con extensión no soportada", () => {
    expectRejected(
      { ...veladoraBlanca, image: "images/products/veladora-blanca-7-dias.svg" },
      "image",
    );
    expectRejected(
      { ...veladoraBlanca, image: "/images/products/veladora-blanca.png" },
      "image",
    );
    expectRejected(
      { ...veladoraBlanca, image: "/images/products/veladora-blanca-7-dias.JPG" },
      "image",
    );
  });
});
