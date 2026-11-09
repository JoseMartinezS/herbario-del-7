import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_FILTERS,
  adminProductsHref,
  filterAdminProducts,
  hasActiveFilters,
  matchesSearchText,
  normalizeSearchText,
  parseAdminFilters,
  type AdminFilters,
  type AdminListProduct,
} from "./admin-filters";
import { CATEGORIES } from "./types";

/**
 * Tests de la parte PURA de búsqueda/filtros/orden del panel: parseo de
 * searchParams con defaults sanos, matcheo de texto sin acentos,
 * predicados de estado/categoría/destacados y los tres órdenes.
 *
 * Todo acá es función pura sobre strings y objetos planos: cero React,
 * cero red (misma convención que slugify.test.ts y supabase-auth.test.ts).
 */

/** Producto mínimo para filtrar/ordenar (el contrato de AdminListProduct). */
function fixture(
  campos: Partial<AdminListProduct> & { slug: string; name: string },
): AdminListProduct {
  return {
    category: "veladoras",
    status: "published",
    featured: false,
    position: 99,
    updatedAt: "2026-01-01T12:00:00.000Z",
    ...campos,
  };
}

/** Lista de prueba: posiciones y fechas DESORDENADAS a propósito. */
const CATALOGO: AdminListProduct[] = [
  fixture({
    slug: "lagrimas-de-maria",
    name: "Lágrimas de María",
    category: "sahumerios-e-inciensos",
    position: 14,
    updatedAt: "2026-11-01T09:00:00.000Z",
  }),
  fixture({
    slug: "veladoras-preparadas",
    name: "Veladoras Preparadas",
    position: 3,
    featured: true,
    updatedAt: "2026-11-03T18:30:00.000Z",
  }),
  fixture({
    slug: "banos-espirituales",
    name: "Baños Espirituales",
    category: "aguas-y-riegos",
    status: "retired",
    position: 7,
    updatedAt: "2026-10-20T08:00:00.000Z",
  }),
  fixture({
    slug: "copal-para-sahumerio",
    name: "Copal para Sahumerio",
    category: "sahumerios-e-inciensos",
    featured: true,
    position: 13,
    updatedAt: "2026-11-02T10:15:00.000Z",
  }),
  fixture({
    slug: "tes-e-infusiones",
    name: "Tés e Infusiones de la Casa",
    category: "hierbas-y-preparados",
    position: 5,
    updatedAt: "fecha-rara", // no parsea: ordena como la más vieja
  }),
  fixture({
    slug: "veladoras-de-parafina",
    name: "Veladoras de Parafina",
    position: 1,
    updatedAt: "2026-10-31T10:00:00.000Z",
  }),
];

describe("parseAdminFilters", () => {
  it("sin parámetros devuelve los defaults de fábrica", () => {
    expect(parseAdminFilters({})).toEqual(DEFAULT_ADMIN_FILTERS);
    expect(parseAdminFilters({ q: undefined, estado: undefined })).toEqual(
      DEFAULT_ADMIN_FILTERS,
    );
  });

  it("acepta los valores válidos de cada parámetro", () => {
    expect(
      parseAdminFilters({
        q: "  copal  ",
        estado: "retirados",
        categoria: "veladoras",
        destacados: "1",
        orden: "editados",
      }),
    ).toEqual({
      search: "copal",
      status: "retirados",
      category: "veladoras",
      featuredOnly: true,
      order: "editados",
    });
  });

  it("los valores explícitos por defecto también parsean (vista guardable)", () => {
    expect(
      parseAdminFilters({
        estado: "todos",
        categoria: "todas",
        orden: "posicion",
      }),
    ).toEqual(DEFAULT_ADMIN_FILTERS);
  });

  it("basura en estado cae a todos (sin romper)", () => {
    expect(parseAdminFilters({ estado: "borrador" }).status).toBe("todos");
    expect(parseAdminFilters({ estado: "PUBLISHED" }).status).toBe("todos");
    expect(parseAdminFilters({ estado: "published" }).status).toBe("todos");
    expect(parseAdminFilters({ estado: "" }).status).toBe("todos");
  });

  it("basura en categoría cae a todas (solo slugs de las 7)", () => {
    expect(parseAdminFilters({ categoria: "inventada" }).category).toBe(
      "todas",
    );
    expect(parseAdminFilters({ categoria: "Veladoras" }).category).toBe(
      "todas",
    );
    expect(parseAdminFilters({ categoria: "todas" }).category).toBe("todas");
    // sanity: las 7 categorías reales pasan todas.
    for (const categoria of CATEGORIES) {
      expect(parseAdminFilters({ categoria }).category).toBe(categoria);
    }
  });

  it("destacados solo se activa con 1 exacto", () => {
    expect(parseAdminFilters({ destacados: "1" }).featuredOnly).toBe(true);
    for (const valor of ["0", "true", "on", "si", "", "01"]) {
      expect(parseAdminFilters({ destacados: valor }).featuredOnly, valor).toBe(
        false,
      );
    }
  });

  it("basura en orden cae a posicion", () => {
    expect(parseAdminFilters({ orden: "recientes" }).order).toBe("posicion");
    expect(parseAdminFilters({ orden: "NOMBRE" }).order).toBe("posicion");
    expect(parseAdminFilters({ orden: "nombre" }).order).toBe("nombre");
    expect(parseAdminFilters({ orden: "editados" }).order).toBe("editados");
  });

  it("de parámetros repetidos gana el primero", () => {
    expect(parseAdminFilters({ q: ["copal", "veladora"] }).search).toBe(
      "copal",
    );
    expect(parseAdminFilters({ estado: ["retirados", "todos"] }).status).toBe(
      "retirados",
    );
  });

  it("el texto de búsqueda se recorta y se topa en 100 caracteres", () => {
    expect(parseAdminFilters({ q: "   " }).search).toBe("");
    expect(
      parseAdminFilters({ q: `  ${"a".repeat(150)}  ` }).search.length,
    ).toBe(100);
    // se conserva CRUDO (con acentos): la normalización es al matchear.
    expect(parseAdminFilters({ q: "Lágrimas" }).search).toBe("Lágrimas");
  });
});

describe("normalizeSearchText", () => {
  it("minúsculas, sin acentos y sin espacios de sobra", () => {
    expect(normalizeSearchText("  Lágrimas de María  ")).toBe(
      "lagrimas de maria",
    );
    expect(normalizeSearchText("ÜÜ ÖÖ ÄÄ")).toBe("uu oo aa");
    expect(normalizeSearchText("Copal")).toBe("copal");
  });
});

describe("matchesSearchText", () => {
  it("el acento no estorca: buscar sin acentos encuentra nombres acentuados", () => {
    const producto = {
      name: "Lágrimas de María",
      slug: "lagrimas-de-maria",
    };
    expect(matchesSearchText(producto, "lagrimas")).toBe(true);
    expect(matchesSearchText(producto, "Lágrimas")).toBe(true);
    expect(matchesSearchText(producto, "MARÍA")).toBe(true);
  });

  it("matchea también por slug (todo lo que ya vive sin acentos)", () => {
    expect(
      matchesSearchText({ name: "Copal para Sahumerio", slug: "copal-para-sahumerio" }, "sahumerio"),
    ).toBe(true);
    expect(
      matchesSearchText({ name: "Otro Producto", slug: "copal-para-sahumerio" }, "copal-para"),
    ).toBe(true);
  });

  it("texto vacío o de solo espacios es sin filtro", () => {
    expect(matchesSearchText({ name: "Copal", slug: "copal" }, "")).toBe(true);
    expect(matchesSearchText({ name: "Copal", slug: "copal" }, "   ")).toBe(
      true,
    );
  });

  it("sin coincidencia devuelve false", () => {
    expect(
      matchesSearchText({ name: "Copal para Sahumerio", slug: "copal-para-sahumerio" }, "veladora"),
    ).toBe(false);
    expect(
      matchesSearchText({ name: "Copal para Sahumerio", slug: "copal-para-sahumerio" }, "maria"),
    ).toBe(false);
  });
});

describe("filterAdminProducts", () => {
  const porSlug = (lista: AdminListProduct[]): string[] =>
    lista.map((p) => p.slug);

  it("con defaults devuelve todo, por posición ascendente", () => {
    const resultado = filterAdminProducts(CATALOGO, DEFAULT_ADMIN_FILTERS);
    expect(porSlug(resultado)).toEqual([
      "veladoras-de-parafina",
      "veladoras-preparadas",
      "tes-e-infusiones",
      "banos-espirituales",
      "copal-para-sahumerio",
      "lagrimas-de-maria",
    ]);
  });

  it("estado publicados esconde los retirados", () => {
    const filtros: AdminFilters = { ...DEFAULT_ADMIN_FILTERS, status: "publicados" };
    expect(porSlug(filterAdminProducts(CATALOGO, filtros))).not.toContain(
      "banos-espirituales",
    );
    expect(filterAdminProducts(CATALOGO, filtros)).toHaveLength(5);
  });

  it("estado retirados deja solo los retirados", () => {
    const filtros: AdminFilters = { ...DEFAULT_ADMIN_FILTERS, status: "retirados" };
    expect(porSlug(filterAdminProducts(CATALOGO, filtros))).toEqual([
      "banos-espirituales",
    ]);
  });

  it("categoría filtra por el slug de las 7", () => {
    const filtros: AdminFilters = {
      ...DEFAULT_ADMIN_FILTERS,
      category: "sahumerios-e-inciensos",
    };
    expect(porSlug(filterAdminProducts(CATALOGO, filtros))).toEqual([
      "copal-para-sahumerio",
      "lagrimas-de-maria",
    ]);
  });

  it("solo destacados deja los marcados con estrella", () => {
    const filtros: AdminFilters = { ...DEFAULT_ADMIN_FILTERS, featuredOnly: true };
    expect(porSlug(filterAdminProducts(CATALOGO, filtros))).toEqual([
      "veladoras-preparadas",
      "copal-para-sahumerio",
    ]);
  });

  it("la búsqueda matchea name y slug sin acentos", () => {
    const filtros: AdminFilters = { ...DEFAULT_ADMIN_FILTERS, search: "veladoras preparadas" };
    expect(porSlug(filterAdminProducts(CATALOGO, filtros))).toEqual([
      "veladoras-preparadas",
    ]);
    const sinAcentos: AdminFilters = { ...DEFAULT_ADMIN_FILTERS, search: "tes" };
    expect(porSlug(filterAdminProducts(CATALOGO, sinAcentos))).toEqual([
      "tes-e-infusiones",
    ]);
  });

  it("los filtros se combinan (búsqueda + categoría + estado)", () => {
    const filtros: AdminFilters = {
      ...DEFAULT_ADMIN_FILTERS,
      search: "maria",
      category: "sahumerios-e-inciensos",
      status: "publicados",
    };
    expect(porSlug(filterAdminProducts(CATALOGO, filtros))).toEqual([
      "lagrimas-de-maria",
    ]);
    // la misma búsqueda con estado retirados no encuentra nada.
    expect(
      filterAdminProducts(CATALOGO, { ...filtros, status: "retirados" }),
    ).toEqual([]);
  });

  it("orden nombre: alfabético sin acentos, empates por posición", () => {
    const conEmpate = [
      ...CATALOGO,
      fixture({ slug: "te-verde-b", name: "Te Verde", position: 50 }),
      fixture({ slug: "te-verde-a", name: "Té Verde", position: 60 }),
    ];
    const filtros: AdminFilters = { ...DEFAULT_ADMIN_FILTERS, order: "nombre" };
    expect(porSlug(filterAdminProducts(conEmpate, filtros))).toEqual([
      "banos-espirituales",
      "copal-para-sahumerio",
      "lagrimas-de-maria",
      "te-verde-b", // "Te Verde" y "Té Verde" empatan sin acentos → posición
      "te-verde-a",
      "tes-e-infusiones",
      "veladoras-de-parafina",
      "veladoras-preparadas",
    ]);
  });

  it("orden editados: última edición primero (updated_at descendente)", () => {
    const filtros: AdminFilters = { ...DEFAULT_ADMIN_FILTERS, order: "editados" };
    expect(porSlug(filterAdminProducts(CATALOGO, filtros))).toEqual([
      "veladoras-preparadas", // 2026-11-03
      "copal-para-sahumerio", // 2026-11-02
      "lagrimas-de-maria", // 2026-11-01
      "veladoras-de-parafina", // 2026-10-31
      "banos-espirituales", // 2026-10-20
      "tes-e-infusiones", // "fecha-rara" no parsea → la más vieja
    ]);
  });

  it("no muta el array de entrada (función pura)", () => {
    const original = [...CATALOGO];
    filterAdminProducts(CATALOGO, {
      ...DEFAULT_ADMIN_FILTERS,
      order: "nombre",
      status: "retirados",
    });
    expect(CATALOGO).toEqual(original);
  });
});

describe("adminProductsHref", () => {
  it("la vista por defecto es /admin pelado (cero query)", () => {
    expect(adminProductsHref({ ...DEFAULT_ADMIN_FILTERS })).toBe("/admin");
  });

  it("solo los no-default viajan en la URL", () => {
    expect(
      adminProductsHref({ ...DEFAULT_ADMIN_FILTERS, status: "retirados" }),
    ).toBe("/admin?estado=retirados");
    expect(
      adminProductsHref({ ...DEFAULT_ADMIN_FILTERS, category: "veladoras" }),
    ).toBe("/admin?categoria=veladoras");
    expect(
      adminProductsHref({ ...DEFAULT_ADMIN_FILTERS, featuredOnly: true }),
    ).toBe("/admin?destacados=1");
    expect(
      adminProductsHref({ ...DEFAULT_ADMIN_FILTERS, order: "editados" }),
    ).toBe("/admin?orden=editados");
  });

  it("la búsqueda se codifica con %20 (como un form GET, no con +)", () => {
    expect(
      adminProductsHref({ ...DEFAULT_ADMIN_FILTERS, search: "copal blanco" }),
    ).toBe("/admin?q=copal%20blanco");
  });

  it("todo activo junto, en orden estable", () => {
    expect(
      adminProductsHref({
        search: "copal blanco",
        status: "retirados",
        category: "veladoras",
        featuredOnly: true,
        order: "editados",
      }),
    ).toBe(
      "/admin?q=copal%20blanco&estado=retirados&categoria=veladoras&destacados=1&orden=editados",
    );
  });
});

describe("hasActiveFilters", () => {
  it("defaults → false", () => {
    expect(hasActiveFilters({ ...DEFAULT_ADMIN_FILTERS })).toBe(false);
  });

  it("cada filtro que oculta productos → true", () => {
    expect(
      hasActiveFilters({ ...DEFAULT_ADMIN_FILTERS, search: "copal" }),
    ).toBe(true);
    expect(
      hasActiveFilters({ ...DEFAULT_ADMIN_FILTERS, status: "publicados" }),
    ).toBe(true);
    expect(
      hasActiveFilters({ ...DEFAULT_ADMIN_FILTERS, category: "veladoras" }),
    ).toBe(true);
    expect(
      hasActiveFilters({ ...DEFAULT_ADMIN_FILTERS, featuredOnly: true }),
    ).toBe(true);
  });

  it("cambiar SOLO el orden no cuenta (reordenar no es filtrar)", () => {
    expect(
      hasActiveFilters({ ...DEFAULT_ADMIN_FILTERS, order: "editados" }),
    ).toBe(false);
  });

  it("texto de solo espacios es como no buscar", () => {
    expect(
      hasActiveFilters({ ...DEFAULT_ADMIN_FILTERS, search: "   " }),
    ).toBe(false);
  });
});
