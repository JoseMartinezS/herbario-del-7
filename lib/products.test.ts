import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCategoriesWithCounts,
  getFeaturedProducts,
  getProductBySlug,
  getProducts,
  getProductsByCategory,
  resetCatalogCacheForTests,
} from "./products";
import {
  fetchSupabaseProducts,
  mapRowToProduct,
  mapRowsToProducts,
} from "./supabase-catalog";
import type { ProductRow } from "./supabase-catalog";
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
 *
 * Desde F2.1 la capa es async y tiene doble modo (JSON local / Supabase
 * con fallback): los primeros describes fijan el contrato del modo JSON
 * (sin env vars, como corre CI); los últimos fijan el mapeo de filas de
 * la base y el fallback.
 */

/** URL pública del bucket de Storage (la que siembra supabase/migration.sql). */
const STORAGE_URL =
  "https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products";

/** Fila REAL de la tabla (snake_case) armada sobre datos del catálogo. */
const filaVeladorasPreparadas: ProductRow = {
  slug: "veladoras-preparadas",
  name: "Veladoras Preparadas",
  short_description:
    "Veladoras ya preparadas con hierbas y esencias para una intención específica.",
  description:
    "Párrafo uno de la descripción.\n\nPárrafo dos de la descripción.",
  category: "veladoras",
  price: null,
  image: `${STORAGE_URL}/veladoras-preparadas.jpg`,
  featured: true,
  status: "published",
  position: 3,
};

/** Segunda fila válida para probar filtrados y duplicados. */
const filaCopal: ProductRow = {
  slug: "copal-blanco",
  name: "Copal para Sahumerio",
  short_description: "Copal en grano para sahumerios, limpias de casa y ceremonias.",
  description: "Párrafo uno.\n\nPárrafo dos.",
  category: "sahumerios-e-inciensos",
  price: null,
  image: `${STORAGE_URL}/copal-para-sahumerio.jpg`,
  featured: true,
  status: "published",
  position: 13,
};

beforeEach(() => {
  // Cada test arranca con los caches vacíos (local y remoto): sin esto,
  // el modo Supabase de un test contaminaría al siguiente.
  resetCatalogCacheForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getProducts (modo JSON local)", () => {
  it("debería devolver las 15 líneas del catálogo, en el orden del JSON", async () => {
    const products = await getProducts();
    expect(products).toHaveLength(15);
    expect(products[0].slug).toBe("veladoras-parafina");
  });

  it("debería tener slugs únicos en todo el catálogo", async () => {
    const slugs = (await getProducts()).map((product) => product.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("sin env vars de Supabase no debería llamar a fetch nunca", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const products = await getProducts();

    expect(products).toHaveLength(15);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getProductBySlug (modo JSON local)", () => {
  it("debería encontrar las veladoras preparadas por su slug", async () => {
    const product = await getProductBySlug("veladoras-preparadas");
    expect(product?.name).toBe("Veladoras Preparadas");
    expect(product?.featured).toBe(true);
  });

  it("debería conservar el slug histórico del copal (la ficha vieja que vive)", async () => {
    const product = await getProductBySlug("copal-blanco");
    expect(product?.name).toBe("Copal para Sahumerio");
    expect(product?.category).toBe("sahumerios-e-inciensos");
  });

  it("debería devolver undefined para un slug que no existe", async () => {
    expect(await getProductBySlug("este-producto-no-existe")).toBeUndefined();
  });
});

describe("getProductsByCategory (modo JSON local)", () => {
  it("debería devolver las 3 líneas de veladoras del catálogo", async () => {
    const slugs = (await getProductsByCategory("veladoras")).map(
      (p) => p.slug,
    );
    expect(slugs).toEqual([
      "veladoras-parafina",
      "veladoras-coctel",
      "veladoras-preparadas",
    ]);
  });

  it("debería devolver las 2 líneas de cuidado personal", async () => {
    const slugs = (await getProductsByCategory("cuidado-personal")).map(
      (p) => p.slug,
    );
    expect(slugs).toEqual(["jabones-y-cremas", "shampoos-y-acondicionadores"]);
  });

  it("debería devolver la única línea de lociones del catálogo", async () => {
    const lociones = await getProductsByCategory("lociones");
    expect(lociones).toHaveLength(1);
    expect(lociones[0].slug).toBe("lociones-wiskeras");
  });

  it("debería devolver las 3 líneas de sahumerios e inciensos", async () => {
    const slugs = (await getProductsByCategory("sahumerios-e-inciensos")).map(
      (p) => p.slug,
    );
    expect(slugs).toEqual([
      "copal-blanco",
      "lagrimas-de-maria",
      "inciensos-de-caja",
    ]);
  });
});

describe("getFeaturedProducts (modo JSON local)", () => {
  it("debería devolver los 3 destacados, todos con featured en true", async () => {
    const featured = await getFeaturedProducts();
    expect(featured).toHaveLength(3);
    expect(featured.every((product) => product.featured === true)).toBe(true);
    expect(featured.map((product) => product.slug).sort()).toEqual(
      ["aguas-espirituales", "copal-blanco", "veladoras-preparadas"].sort(),
    );
  });
});

describe("getCategoriesWithCounts (modo JSON local)", () => {
  it("debería devolver las 7 categorías, ninguna vacía", async () => {
    const entries = await getCategoriesWithCounts();
    expect(entries).toHaveLength(7);
    expect(entries.every((entry) => entry.count > 0)).toBe(true);
  });

  it("debería reportar los conteos correctos por categoría", async () => {
    const counts = new Map(
      (await getCategoriesWithCounts()).map(
        (entry) => [entry.category, entry.count] as const,
      ),
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

  it("debería usar las etiquetas legibles de CATEGORY_INFO", async () => {
    const entries = await getCategoriesWithCounts();
    const veladoras = entries.find((entry) => entry.category === "veladoras");
    expect(veladoras?.name).toBe("Veladoras");
    const sahumerios = entries.find(
      (entry) => entry.category === "sahumerios-e-inciensos",
    );
    expect(sahumerios?.name).toBe("Sahumerios e Inciensos");
  });
});

describe("precios del catálogo (modo JSON local)", () => {
  it("debería publicar todas las líneas sin precio (consulta por WhatsApp)", async () => {
    const conPrecio = (await getProducts()).filter(
      (product) => product.price !== null,
    );
    expect(conPrecio).toHaveLength(0);
    const sinPrecio = (await getProducts()).filter(
      (product) => product.price === null,
    );
    expect(sinPrecio).toHaveLength(15);
  });
});

describe("modo Supabase: mapeo ProductRow → Product", () => {
  it("debería mapear las columnas snake_case al tipo Product (camelCase)", () => {
    const product = mapRowToProduct(filaVeladorasPreparadas);

    expect(product).not.toBeNull();
    expect(product?.slug).toBe("veladoras-preparadas");
    expect(product?.name).toBe("Veladoras Preparadas");
    expect(product?.shortDescription).toBe(
      filaVeladorasPreparadas.short_description,
    );
    expect(product?.description).toBe(filaVeladorasPreparadas.description);
    expect(product?.category).toBe("veladoras");
    // La URL absoluta del bucket se conserva tal cual (la usa next/image).
    expect(product?.image).toBe(`${STORAGE_URL}/veladoras-preparadas.jpg`);
  });

  it("debería conservar price null y featured true tal cual llegan", () => {
    const product = mapRowToProduct(filaVeladorasPreparadas);

    expect(product?.price).toBeNull();
    expect(product?.featured).toBe(true);
  });

  it("no debería filtrar columnas de la tabla hacia el tipo Product", () => {
    const product = mapRowToProduct(filaVeladorasPreparadas);

    // El tipo Product no lleva status/position/id: la UI no debe verlos.
    expect(Object.keys(product ?? {}).sort()).toEqual([
      "category",
      "description",
      "featured",
      "image",
      "name",
      "price",
      "shortDescription",
      "slug",
    ]);
  });

  it("debería devolver null si la categoría no es una de las 7 del sitio", () => {
    const product = mapRowToProduct({
      ...filaVeladorasPreparadas,
      category: "otros",
    });
    expect(product).toBeNull();
  });

  it("debería aceptar una fila con precio numérico (cuando el dueño cargue precios)", () => {
    const product = mapRowToProduct({
      ...filaVeladorasPreparadas,
      price: 45,
    });
    expect(product?.price).toBe(45);
  });
});

describe("modo Supabase: filtrado de filas (mapRowsToProducts)", () => {
  it("solo debería servir filas published: retired jamás llega al público", () => {
    const products = mapRowsToProducts([
      filaVeladorasPreparadas,
      { ...filaCopal, status: "retired" },
    ]);

    expect(products).toHaveLength(1);
    expect(products[0].slug).toBe("veladoras-preparadas");
  });

  it("debería ignorar filas malformadas sin tumbar el resto del catálogo", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const products = mapRowsToProducts([
      filaVeladorasPreparadas,
      { ...filaCopal, price: -10 }, // precio negativo: fila inválida
      { ...filaCopal, slug: "Sin Kebab" }, // slug que rompe el patrón
      "no soy un objeto",
      null,
    ]);

    expect(products.map((product) => product.slug)).toEqual([
      "veladoras-preparadas",
    ]);
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it("debería ignorar slugs duplicados (protege generateStaticParams)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const products = mapRowsToProducts([
      filaVeladorasPreparadas,
      filaVeladorasPreparadas,
    ]);

    expect(products).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("debería devolver [] si la respuesta no es un arreglo", () => {
    expect(mapRowsToProducts({ error: "ups" })).toEqual([]);
    expect(mapRowsToProducts("nope")).toEqual([]);
    expect(mapRowsToProducts(null)).toEqual([]);
  });
});

describe("modo Supabase: fallback a products.json", () => {
  it("si el fetch a Supabase revienta, debería servir el JSON local y avisar", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red caída")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const products = await getProducts();

    expect(products).toHaveLength(15);
    expect(products[0].slug).toBe("veladoras-parafina");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Supabase falló"),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("fallback"),
    );
  });

  it("si Supabase responde HTTP de error, debería caer al JSON local", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const products = await getProducts();

    expect(products).toHaveLength(15);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 500"));
  });

  it("si Supabase devuelve un catálogo vacío, debería caer al JSON local", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as unknown as Response),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const products = await getProducts();

    expect(products).toHaveLength(15);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("fallback"),
    );
  });

  it("con env vars y respuesta válida, debería servir el catálogo de Supabase", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [filaVeladorasPreparadas, filaCopal],
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const products = await getProducts();
    const bySlug = await getProductBySlug("copal-blanco");

    expect(products).toHaveLength(2);
    expect(products.map((product) => product.slug)).toEqual([
      "veladoras-preparadas",
      "copal-blanco",
    ]);
    expect(bySlug?.image).toBe(`${STORAGE_URL}/copal-para-sahumerio.jpg`);
    expect(warn).not.toHaveBeenCalled();
    // El contrato de la llamada REST queda fijado: PostgREST con select
    // explícito, filtro de status y orden por position.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/products?"),
      expect.objectContaining({
        headers: {
          apikey: "anon-de-prueba",
          Authorization: "Bearer anon-de-prueba",
        },
      }),
    );
  });

  it("fetchSupabaseProducts debería pedir solo las filas published por position", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [filaVeladorasPreparadas],
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const products = await fetchSupabaseProducts({
      url: "https://ejemplo.supabase.co",
      anonKey: "anon-de-prueba",
    });

    expect(products).toHaveLength(1);
    const [endpoint] = fetchMock.mock.calls[0] as [string];
    expect(endpoint).toContain("select=slug,name,short_description");
    expect(endpoint).toContain("status=eq.published");
    expect(endpoint).toContain("order=position.asc");
  });
});
