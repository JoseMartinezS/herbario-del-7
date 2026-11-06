import { describe, expect, it } from "vitest";
import {
  getCategoriesWithCounts,
  getFeaturedProducts,
  getProductBySlug,
  getProducts,
  getProductsByCategory,
} from "./products";
import { CATEGORIES } from "./types";

/**
 * Tests de la capa de acceso al catálogo contra el products.json REAL.
 *
 * Estos tests son change-detectors INTENCIONALES: el dueño edita seguido el
 * JSON, y si algo cambia (conteos, destacados, precios) estos tests se lo
 * señalan antes de que llegue a producción.
 *
 * El catálogo son LÍNEAS de producto (una ficha por línea del mostrador,
 * con foto real); el detalle de cada línea se pregunta por WhatsApp.
 */

describe("getProducts", () => {
  it("debería devolver las 15 líneas del catálogo, en el orden del JSON", () => {
    const products = getProducts();
    expect(products).toHaveLength(15);
    expect(products[0].slug).toBe("veladoras-parafina");
  });

  it("debería tener slugs únicos en todo el catálogo", () => {
    const slugs = getProducts().map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("getProductBySlug", () => {
  it("debería encontrar las veladoras preparadas por su slug", () => {
    const product = getProductBySlug("veladoras-preparadas");
    expect(product?.name).toBe("Veladoras Preparadas");
    expect(product?.featured).toBe(true);
  });

  it("debería conservar el slug histórico del copal (la ficha vieja que vive)", () => {
    const product = getProductBySlug("copal-blanco");
    expect(product?.name).toBe("Copal para Sahumerio");
    expect(product?.category).toBe("sahumerios-e-inciensos");
  });

  it("debería devolver undefined para un slug que no existe", () => {
    expect(getProductBySlug("este-producto-no-existe")).toBeUndefined();
  });
});

describe("getProductsByCategory", () => {
  it("debería devolver las 3 líneas de veladoras del catálogo", () => {
    const slugs = getProductsByCategory("veladoras").map((p) => p.slug);
    expect(slugs).toEqual([
      "veladoras-parafina",
      "veladoras-coctel",
      "veladoras-preparadas",
    ]);
  });

  it("debería devolver las 2 líneas de cuidado personal", () => {
    const slugs = getProductsByCategory("cuidado-personal").map((p) => p.slug);
    expect(slugs).toEqual(["jabones-y-cremas", "shampoos-y-acondicionadores"]);
  });

  it("debería devolver la única línea de lociones del catálogo", () => {
    const lociones = getProductsByCategory("lociones");
    expect(lociones).toHaveLength(1);
    expect(lociones[0].slug).toBe("lociones-wiskeras");
  });

  it("debería devolver las 3 líneas de sahumerios e inciensos", () => {
    const slugs = getProductsByCategory("sahumerios-e-inciensos").map(
      (p) => p.slug,
    );
    expect(slugs).toEqual(["copal-blanco", "lagrimas-de-maria", "inciensos-de-caja"]);
  });
});

describe("getFeaturedProducts", () => {
  it("debería devolver los 3 destacados, todos con featured en true", () => {
    const featured = getFeaturedProducts();
    expect(featured).toHaveLength(3);
    expect(featured.every((product) => product.featured === true)).toBe(true);
    expect(featured.map((product) => product.slug).sort()).toEqual(
      ["aguas-espirituales", "copal-blanco", "veladoras-preparadas"].sort(),
    );
  });
});

describe("getCategoriesWithCounts", () => {
  it("debería devolver las 7 categorías, ninguna vacía", () => {
    const entries = getCategoriesWithCounts();
    expect(entries).toHaveLength(7);
    expect(entries.every((entry) => entry.count > 0)).toBe(true);
  });

  it("debería reportar los conteos correctos por categoría", () => {
    const counts = new Map(
      getCategoriesWithCounts().map((entry) => [entry.category, entry.count] as const),
    );
    // Las categorías del catálogo son exactamente las 7 de lib/types.ts
    // (la categoría "otros" desapareció al entrar "sahumerios-e-inciensos").
    expect([...counts.keys()].sort()).toEqual([...CATEGORIES].sort());
    expect(counts.get("veladoras")).toBe(3);
    expect(counts.get("hierbas-y-preparados")).toBe(2);
    expect(counts.get("aguas-y-riegos")).toBe(3);
    expect(counts.get("cuidado-personal")).toBe(2);
    expect(counts.get("sahumerios-e-inciensos")).toBe(3);
    expect(counts.get("lociones")).toBe(1);
    expect(counts.get("capsulas-y-suplementos")).toBe(1);
  });

  it("debería usar las etiquetas legibles de CATEGORY_INFO", () => {
    const entries = getCategoriesWithCounts();
    const veladoras = entries.find((entry) => entry.category === "veladoras");
    expect(veladoras?.name).toBe("Veladoras");
    const sahumerios = entries.find(
      (entry) => entry.category === "sahumerios-e-inciensos",
    );
    expect(sahumerios?.name).toBe("Sahumerios e Inciensos");
  });
});

describe("precios del catálogo", () => {
  it("debería publicar todas las líneas sin precio (consulta por WhatsApp)", () => {
    const conPrecio = getProducts().filter(
      (product) => product.price !== null,
    );
    expect(conPrecio).toHaveLength(0);
    const sinPrecio = getProducts().filter(
      (product) => product.price === null,
    );
    expect(sinPrecio).toHaveLength(15);
  });
});
