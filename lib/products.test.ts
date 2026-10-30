import { describe, expect, it } from "vitest";
import {
  getCategoriesWithCounts,
  getFeaturedProducts,
  getProductBySlug,
  getProducts,
  getProductsByCategory,
} from "./products";

/**
 * Tests de la capa de acceso al catálogo contra el products.json REAL.
 *
 * Estos tests son change-detectors INTENCIONALES: el dueño edita seguido el
 * JSON, y si algo cambia (conteos, destacados, precios) estos tests se lo
 * señalan antes de que llegue a producción.
 */

describe("getProducts", () => {
  it("debería devolver los 10 productos del catálogo, en el orden del JSON", () => {
    const products = getProducts();
    expect(products).toHaveLength(10);
    expect(products[0].slug).toBe("veladora-blanca-7-dias");
  });

  it("debería tener slugs únicos en todo el catálogo", () => {
    const slugs = getProducts().map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("getProductBySlug", () => {
  it("debería encontrar la veladora blanca por su slug", () => {
    const product = getProductBySlug("veladora-blanca-7-dias");
    expect(product?.name).toBe("Veladora Blanca de 7 Días");
    expect(product?.featured).toBe(true);
  });

  it("debería devolver undefined para un slug que no existe", () => {
    expect(getProductBySlug("este-producto-no-existe")).toBeUndefined();
  });
});

describe("getProductsByCategory", () => {
  it("debería devolver las 2 veladoras del catálogo", () => {
    const slugs = getProductsByCategory("veladoras").map((p) => p.slug);
    expect(slugs).toEqual(["veladora-blanca-7-dias", "veladora-roja-7-dias"]);
  });

  it("debería devolver los 2 productos de cuidado personal", () => {
    const slugs = getProductsByCategory("cuidado-personal").map((p) => p.slug);
    expect(slugs).toEqual(["shampoo-sabila-romero", "jabon-miel-avena"]);
  });

  it("debería devolver la única loción del catálogo", () => {
    const lociones = getProductsByCategory("lociones");
    expect(lociones).toHaveLength(1);
    expect(lociones[0].slug).toBe("locion-ruda");
  });
});

describe("getFeaturedProducts", () => {
  it("debería devolver los 3 destacados, todos con featured en true", () => {
    const featured = getFeaturedProducts();
    expect(featured).toHaveLength(3);
    expect(featured.every((product) => product.featured === true)).toBe(true);
    expect(featured.map((product) => product.slug).sort()).toEqual(
      ["agua-san-miguel", "ruda-fresca", "veladora-blanca-7-dias"].sort(),
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
    expect(counts.get("veladoras")).toBe(2);
    expect(counts.get("hierbas-y-preparados")).toBe(2);
    expect(counts.get("cuidado-personal")).toBe(2);
    expect(counts.get("aguas-y-riegos")).toBe(1);
    expect(counts.get("lociones")).toBe(1);
    expect(counts.get("capsulas-y-suplementos")).toBe(1);
    expect(counts.get("otros")).toBe(1);
  });

  it("debería usar las etiquetas legibles de CATEGORY_INFO", () => {
    const entries = getCategoriesWithCounts();
    const veladoras = entries.find((entry) => entry.category === "veladoras");
    expect(veladoras?.name).toBe("Veladoras");
  });
});

describe("precios del catálogo", () => {
  it("debería tener precio solo en los dos productos con precio definido", () => {
    expect(getProductBySlug("veladora-roja-7-dias")?.price).toBe(45);
    expect(getProductBySlug("te-manzanilla-tila")?.price).toBe(60);
    const sinPrecio = getProducts().filter((product) => product.price === null);
    expect(sinPrecio).toHaveLength(8);
  });
});
