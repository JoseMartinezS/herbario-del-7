import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCategoryList,
  getLocalCategories,
  invalidateCategoriesCache,
  nombreDeCategoria,
  resetCategoriesCacheForTests,
  slugsDeCategorias,
  estiloDeCategoria,
  validarCategoriasDeCatalogo,
} from "./categories";
import { CATEGORIES } from "./types";
import type { Categoria } from "./types";

/**
 * Tests de la capa de categorías (F2.5): semilla local, validación cruzada
 * del catálogo, doble modo (JSON local / Supabase con fallback), TTL de la
 * memoización y los helpers puros que la UI usa para etiquetas y tintes.
 *
 * Cambio estructural que estos tests fijan: las categorías DEJARON de ser
 * un enum compilado. La fuente es content/categories.json (local) o la
 * tabla `categories` (remoto) — y los guards del catálogo validan contra
 * ESA lista, no contra CATEGORIES del código (que queda como semilla de
 * referencia). Misma convención que products.test.ts: fixtures planos,
 * mocks de fetch por test, cero React.
 */

/** Fila de `categories` como llega de PostgREST (snake… bueno, ya en español). */
const filaVeladoras = {
  slug: "veladoras",
  nombre: "Veladoras",
  descripcion: "Las veladoras de siempre.",
  posicion: 1,
};

/** Fila de una categoría NUEVA (la que habilita toda esta fase). */
const filaAmuletos = {
  slug: "amuletos",
  nombre: "Amuletos",
  descripcion: "Amuletos y talismanes de la casa.",
  posicion: 8,
};

/** Respuesta REST ok (el cuerpo puede ser cualquiera: filas o basura). */
function respuestaOk(cuerpo: unknown): Response {
  return { ok: true, status: 200, json: async () => cuerpo } as unknown as Response;
}

beforeEach(() => {
  // Cada test arranca con los caches vacíos (local y remoto): sin esto,
  // el modo Supabase de un test contaminaría al siguiente.
  resetCategoriesCacheForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("semilla local (content/categories.json)", () => {
  it("debería parsear las 7 familias de la semilla", () => {
    expect(getLocalCategories()).toHaveLength(7);
  });

  it("debería venir ordenada por posición (1 a 7)", () => {
    const posiciones = getLocalCategories().map((categoria) => categoria.posicion);
    expect(posiciones).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("los slugs coinciden EXACTOS con CATEGORIES (la semilla del código)", () => {
    const slugs = getLocalCategories().map((categoria) => categoria.slug);
    expect(slugs).toEqual([...CATEGORIES]);
  });

  it("cada familia trae nombre legible y descripción", () => {
    for (const categoria of getLocalCategories()) {
      expect(categoria.nombre.length).toBeGreaterThan(0);
      expect(categoria.descripcion.length).toBeGreaterThan(0);
    }
  });

  it("conserva las etiquetas históricas del sitio", () => {
    const categorias = getLocalCategories();
    expect(nombreDeCategoria(categorias, "veladoras")).toBe("Veladoras");
    expect(nombreDeCategoria(categorias, "sahumerios-e-inciensos")).toBe(
      "Sahumerios e Inciensos",
    );
    expect(nombreDeCategoria(categorias, "capsulas-y-suplementos")).toBe(
      "Cápsulas y suplementos",
    );
  });
});

describe("validación cruzada del catálogo (fail-fast local)", () => {
  it("pasa cuando todas las categorías de los productos existen en la semilla", () => {
    expect(() =>
      validarCategoriasDeCatalogo(
        [
          { slug: "veladoras-parafina", category: "veladoras" },
          { slug: "copal-blanco", category: "sahumerios-e-inciensos" },
        ],
        getLocalCategories(),
      ),
    ).not.toThrow();
  });

  it("REVIENTA si un producto usa una categoría fuera de categories.json", () => {
    expect(() =>
      validarCategoriasDeCatalogo(
        [{ slug: "producto-fantasma", category: "otros" }],
        getLocalCategories(),
      ),
    ).toThrow(/otros/);
  });

  it("el mensaje nombra el producto culpable y el archivo a corregir", () => {
    let mensaje = "";
    try {
      validarCategoriasDeCatalogo(
        [{ slug: "producto-fantasma", category: "otros" }],
        [],
      );
    } catch (error: unknown) {
      mensaje = error instanceof Error ? error.message : "";
    }
    expect(mensaje).toContain("producto-fantasma");
    expect(mensaje).toContain("otros");
    expect(mensaje).toContain("categories.json");
  });
});

describe("modo local (sin env vars)", () => {
  it("getCategoryList sirve la semilla sin tocar la red", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const categorias = await getCategoryList();

    expect(categorias).toHaveLength(7);
    expect(categorias[0]?.slug).toBe("veladoras");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("modo Supabase (remoto)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
  });

  it("con respuesta válida sirve las categorías de la tabla, mapeadas tal cual", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuestaOk([filaVeladoras, filaAmuletos])),
    );

    const categorias = await getCategoryList();

    expect(categorias.map((categoria) => categoria.slug)).toEqual([
      "veladoras",
      "amuletos",
    ]);
    expect(categorias[1]).toEqual({
      slug: "amuletos",
      nombre: "Amuletos",
      descripcion: "Amuletos y talismanes de la casa.",
      posicion: 8,
    });
  });

  it("el contrato REST queda fijado (select + order + headers del catálogo)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaOk([filaVeladoras]));
    vi.stubGlobal("fetch", fetchMock);

    await getCategoryList();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ejemplo.supabase.co/rest/v1/categories?select=slug,nombre,descripcion,posicion&order=posicion.asc",
      expect.objectContaining({
        headers: {
          apikey: "anon-de-prueba",
          Authorization: "Bearer anon-de-prueba",
        },
        cache: "no-store",
      }),
    );
  });

  it("si el fetch revienta, sirve el categories.json local y avisa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red caída")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const categorias = await getCategoryList();

    expect(categorias).toHaveLength(7);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Supabase falló"),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("fallback"));
  });

  it("si responde HTTP de error, cae al JSON local", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 } as unknown as Response),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const categorias = await getCategoryList();

    expect(categorias).toHaveLength(7);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 500"));
  });

  it("si la respuesta no es un arreglo, cae al JSON local", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuestaOk({ error: "ups" })),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const categorias = await getCategoryList();

    expect(categorias).toHaveLength(7);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("fallback"));
  });

  it("si la tabla queda vacía, cae al JSON local (una lista vacía rompería la navegación)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaOk([])));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const categorias = await getCategoryList();

    expect(categorias).toHaveLength(7);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("fallback"));
  });

  it("las filas malformadas se descartan con warn sin tumbar la lista", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respuestaOk([
          filaAmuletos,
          { slug: "Sin Kebab", nombre: "Roto", descripcion: "", posicion: 9 },
          "no soy un objeto",
          null,
        ]),
      ),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const categorias = await getCategoryList();

    expect(categorias.map((categoria) => categoria.slug)).toEqual(["amuletos"]);
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe("memoización del modo remoto (TTL 60 s)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
  });

  it("dos llamadas dentro del TTL comparten UN solo fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaOk([filaVeladoras]));
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([getCategoryList(), getCategoryList()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("vencido el TTL, la siguiente llamada vuelve a fetchear", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockResolvedValue(respuestaOk([filaVeladoras]));
      vi.stubGlobal("fetch", fetchMock);

      await getCategoryList();
      vi.setSystemTime(Date.now() + 61_000);
      await getCategoryList();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidateCategoriesCache fuerza un refresco inmediato (sin esperar el TTL)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaOk([filaVeladoras]));
    vi.stubGlobal("fetch", fetchMock);

    await getCategoryList();
    invalidateCategoriesCache();
    await getCategoryList();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resetCategoriesCacheForTests despeja también el cache remoto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaOk([filaVeladoras]));
    vi.stubGlobal("fetch", fetchMock);

    await getCategoryList();
    resetCategoriesCacheForTests();
    await getCategoryList();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("slugsDeCategorias", () => {
  it("arma el Set de slugs que usan los guards de filas", () => {
    const slugs = slugsDeCategorias(getLocalCategories());
    expect(slugs.size).toBe(7);
    expect(slugs.has("veladoras")).toBe(true);
    expect(slugs.has("otros")).toBe(false);
  });
});

describe("nombreDeCategoria", () => {
  it("resuelve las etiquetas de la semilla", () => {
    const categorias = getLocalCategories();
    expect(nombreDeCategoria(categorias, "veladoras")).toBe("Veladoras");
    expect(nombreDeCategoria(categorias, "hierbas-y-preparados")).toBe(
      "Hierbas y preparados",
    );
  });

  it("un slug que no está en la lista devuelve el slug crudo (nunca revienta)", () => {
    expect(nombreDeCategoria([], "amuletos")).toBe("amuletos");
    expect(nombreDeCategoria(getLocalCategories(), "inventada")).toBe(
      "inventada",
    );
  });
});

describe("estiloDeCategoria", () => {
  /** El tinte histórico por semilla: contrato byte-idéntico del render. */
  const ESTILO_HISTORICO: Record<string, string> = {
    veladoras: "border-terracotta-200 bg-terracotta-100 text-terracotta-800",
    "hierbas-y-preparados": "border-green-200 bg-green-100 text-green-800",
    "aguas-y-riegos": "border-green-200 bg-green-50 text-green-700",
    lociones: "border-terracotta-200 bg-terracotta-50 text-terracotta-800",
    "capsulas-y-suplementos": "border-gold-200 bg-gold-100 text-gold-800",
    "cuidado-personal": "border-green-200 bg-green-100 text-green-800",
    "sahumerios-e-inciensos": "border-gold-300 bg-gold-100 text-gold-900",
  };

  it("las 7 semillas conservan su tinte histórico EXACTO", () => {
    const categorias = getLocalCategories();
    for (const slug of CATEGORIES) {
      expect(estiloDeCategoria(categorias, slug)).toBe(ESTILO_HISTORICO[slug]);
    }
  });

  it("una categoría nueva recibe un tinte de la paleta, determinístico", () => {
    const nuevas: Categoria[] = [
      { slug: "amuletos", nombre: "Amuletos", descripcion: "", posicion: 8 },
      { slug: "brujeria", nombre: "Brujería", descripcion: "", posicion: 9 },
    ];

    const tinteAmuletos = estiloDeCategoria(nuevas, "amuletos");

    // mismo input → mismo tinte (el render no "baila" entre pasadas).
    expect(estiloDeCategoria(nuevas, "amuletos")).toBe(tinteAmuletos);
    // tinte servible: la misma forma de clase que los históricos.
    expect(tinteAmuletos).toMatch(/^border-\S+ bg-\S+ text-\S+$/);
    // la rotación es por posición: familias nuevas distintas no se visten igual.
    expect(estiloDeCategoria(nuevas, "brujeria")).not.toBe(tinteAmuletos);
  });

  it("un slug que no está en la lista tampoco revienta (tinte estable del slug)", () => {
    const tinte = estiloDeCategoria([], "amuletos");
    expect(tinte).toMatch(/^border-\S+ bg-\S+ text-\S+$/);
    expect(estiloDeCategoria([], "amuletos")).toBe(tinte);
  });
});
