import { describe, expect, it } from "vitest";
import { buildBreadcrumbSchema, buildProductSchema } from "./product-schema";
import type { Product } from "./types";

/**
 * Tests de los generadores JSON-LD de la ficha de producto.
 *
 * Google lee estos schemas del HTML servido: una URL relativa o un
 * `offers` vacío arruinan el rich result en vez de ayudarlo. Estas
 * reglas fijan la forma exacta que debe salir de los generadores.
 */

/** URL pública del sitio (lib/site.ts); pasada explícita para que el
 * test no dependa del entorno. */
const SITE_URL = "https://herbariodel7.com";

/** Producto REAL del catálogo, CON precio (content/products.json). */
const veladoraRoja = {
  slug: "veladora-roja-7-dias",
  name: "Veladora Roja de 7 Días",
  shortDescription: "Vela roja de 7 días para peticiones de amor, pasión y fuerza.",
  description:
    "En la tradición esotérica mexicana, el color rojo se asocia con el amor, la pasión y la vitalidad. Esta veladora se enciende tradicionalmente para peticiones de amor propio, para fortalecer las relaciones y para levantar el ánimo del hogar.\n\nSu cera de combustión lenta acompaña tus peticiones durante los siete días de la novena. Te podemos asesorar sobre cómo combinarla con hierbas u otras veladoras según tu intención.",
  category: "veladoras",
  price: 45,
  image: "/images/products/veladora-roja-7-dias.svg",
} satisfies Product;

/** Producto REAL del catálogo, SIN precio (consulta por WhatsApp). */
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

describe("buildProductSchema", () => {
  it("debería incluir offers con priceCurrency MXN cuando el producto tiene precio", () => {
    const schema = buildProductSchema(veladoraRoja, SITE_URL);

    expect(schema.offers).toBeDefined();
    expect(schema.offers?.price).toBe(45);
    expect(schema.offers?.priceCurrency).toBe("MXN");
    expect(schema.offers?.availability).toBe("https://schema.org/InStock");
  });

  it("debería salir SIN offers cuando el precio es null (consulta por WhatsApp)", () => {
    const schema = buildProductSchema(veladoraBlanca, SITE_URL);

    expect(schema.offers).toBeUndefined();
    expect("offers" in schema).toBe(false);
  });

  it("debería construir image y url absolutas a partir de la ruta pública del SVG", () => {
    for (const product of [veladoraRoja, veladoraBlanca]) {
      const schema = buildProductSchema(product, SITE_URL);

      expect(schema.image).toBe(`${SITE_URL}${product.image}`);
      expect(schema.url).toBe(`${SITE_URL}/catalogo/${product.slug}`);
      expect(schema.image.startsWith("https://")).toBe(true);
      expect(schema.url.startsWith("https://")).toBe(true);
    }
  });

  it("debería usar la etiqueta legible de la categoría y la descripción corta", () => {
    const schema = buildProductSchema(veladoraRoja, SITE_URL);

    expect(schema.category).toBe("Veladoras");
    expect(schema.description).toBe(veladoraRoja.shortDescription);
    expect(schema.name).toBe(veladoraRoja.name);
    expect(schema["@type"]).toBe("Product");
  });
});

describe("buildBreadcrumbSchema", () => {
  it("debería armar la miga Inicio › Catálogo › Producto con posiciones 1/2/3", () => {
    const schema = buildBreadcrumbSchema(veladoraRoja, SITE_URL);

    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(3);

    const [inicio, catalogo, producto] = schema.itemListElement;
    expect(inicio.position).toBe(1);
    expect(inicio.name).toBe("Inicio");
    expect(inicio.item).toBe(SITE_URL);

    expect(catalogo.position).toBe(2);
    expect(catalogo.name).toBe("Catálogo");
    expect(catalogo.item).toBe(`${SITE_URL}/catalogo`);

    // El producto cierra la miga: posición 3, su nombre y su URL absoluta.
    expect(producto.position).toBe(3);
    expect(producto.name).toBe("Veladora Roja de 7 Días");
    expect(producto.item).toBe(`${SITE_URL}/catalogo/veladora-roja-7-dias`);
    expect(producto.item.startsWith("https://")).toBe(true);
  });
});
