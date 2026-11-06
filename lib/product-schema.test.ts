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

/**
 * Producto SINTÉTICO con precio: el catálogo real se publica entero con
 * `price: null` (consulta por WhatsApp), así que el caso offers-con-precio
 * del generador se fija con esta fixture armada sobre datos reales.
 */
const veladoraConPrecio = {
  slug: "veladoras-parafina",
  name: "Veladoras de Parafina",
  shortDescription:
    "Veladoras de parafina de 7 días en varios colores para cada intención.",
  description:
    "Las veladoras de parafina son las de toda la vida: cera de combustión lenta, frasco de vidrio y mecha que acompaña los siete días de una novena. En la tradición mexicana cada color lleva su intención, y en el mostrador te ayudamos a elegir la indicada para tu petición.\n\nManejamos la línea en varios colores y tamaños, de la blanca clásica a las de intención específica. Consulta por WhatsApp el color y el tamaño que buscas y te decimos qué hay disponibles hoy.",
  category: "veladoras",
  price: 45,
  image: "/images/products/veladoras-parafina.jpg",
} satisfies Product;

/** Producto REAL del catálogo, SIN precio (consulta por WhatsApp). */
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

describe("buildProductSchema", () => {
  it("debería incluir offers con priceCurrency MXN cuando el producto tiene precio", () => {
    const schema = buildProductSchema(veladoraConPrecio, SITE_URL);

    expect(schema.offers).toBeDefined();
    expect(schema.offers?.price).toBe(45);
    expect(schema.offers?.priceCurrency).toBe("MXN");
    expect(schema.offers?.availability).toBe("https://schema.org/InStock");
  });

  it("debería salir SIN offers cuando el precio es null (consulta por WhatsApp)", () => {
    const schema = buildProductSchema(veladorasPreparadas, SITE_URL);

    expect(schema.offers).toBeUndefined();
    expect("offers" in schema).toBe(false);
  });

  it("debería construir image y url absolutas a partir de la ruta pública de la imagen", () => {
    for (const product of [veladoraConPrecio, veladorasPreparadas]) {
      const schema = buildProductSchema(product, SITE_URL);

      expect(schema.image).toBe(`${SITE_URL}${product.image}`);
      expect(schema.url).toBe(`${SITE_URL}/catalogo/${product.slug}`);
      expect(schema.image.startsWith("https://")).toBe(true);
      expect(schema.url.startsWith("https://")).toBe(true);
    }
  });

  it("debería usar la etiqueta legible de la categoría y la descripción corta", () => {
    const schema = buildProductSchema(veladoraConPrecio, SITE_URL);

    expect(schema.category).toBe("Veladoras");
    expect(schema.description).toBe(veladoraConPrecio.shortDescription);
    expect(schema.name).toBe(veladoraConPrecio.name);
    expect(schema["@type"]).toBe("Product");
  });
});

describe("buildBreadcrumbSchema", () => {
  it("debería armar la miga Inicio › Catálogo › Producto con posiciones 1/2/3", () => {
    const schema = buildBreadcrumbSchema(veladoraConPrecio, SITE_URL);

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
    expect(producto.name).toBe("Veladoras de Parafina");
    expect(producto.item).toBe(`${SITE_URL}/catalogo/veladoras-parafina`);
    expect(producto.item.startsWith("https://")).toBe(true);
  });
});
