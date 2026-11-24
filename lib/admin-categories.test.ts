import { describe, expect, it } from "vitest";
import {
  calcularSiguientePosicion,
  categoriaCreateSchema,
  categoriaEditSchema,
  contarProductosPorCategoria,
  echoCategoriaDesdeParams,
  mensajeErrorDesdeParams,
  mensajeOkDesdeParams,
  slugDeCategoriaValido,
  textoDeConteo,
} from "./admin-categories";

/**
 * Tests de la parte PURA del CRUD de categorías del panel (F2.5, F4):
 * validación zod, palabra reservada del slug, cálculo de posición, conteo
 * de fichas y los mensajes PRG del banner (?ok= / ?error=) con su
 * echo-back. Sin red ni React (mismo criterio que admin-products.test.ts):
 * las funciones que hablan con Supabase las cubre el E2E de protección y
 * el smoke del dueño contra el panel real.
 */

/* ============================================================================
 * Esquemas zod
 * ==========================================================================*/

describe("categoriaCreateSchema (alta)", () => {
  it("acepta nombre y descripción sanos", () => {
    const resultado = categoriaCreateSchema.safeParse({
      nombre: "Amuletos",
      descripcion: "Amuletos y talismanes de la casa.",
    });
    expect(resultado.success).toBe(true);
  });

  it("acepta descripción vacía (es opcional para la grilla)", () => {
    const resultado = categoriaCreateSchema.safeParse({
      nombre: "Amuletos",
      descripcion: "",
    });
    expect(resultado.success).toBe(true);
  });

  it("recorta espacios y rechaza un nombre de solo espacios", () => {
    const resultado = categoriaCreateSchema.safeParse({
      nombre: "   ",
      descripcion: "",
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza nombres de más de 80 caracteres", () => {
    const resultado = categoriaCreateSchema.safeParse({
      nombre: "x".repeat(81),
      descripcion: "",
    });
    expect(resultado.success).toBe(false);
  });

  it("rechaza descripciones de más de 300 caracteres", () => {
    const resultado = categoriaCreateSchema.safeParse({
      nombre: "Amuletos",
      descripcion: "x".repeat(301),
    });
    expect(resultado.success).toBe(false);
  });
});

describe("categoriaEditSchema (edición)", () => {
  it("acepta nombre, descripción y posición entera desde 1", () => {
    const resultado = categoriaEditSchema.safeParse({
      nombre: "Veladoras",
      descripcion: "Las veladoras de siempre.",
      posicion: 2,
    });
    expect(resultado.success).toBe(true);
  });

  it("rechaza posición 0, fraccionada, negativa o fuera de tope", () => {
    expect(
      categoriaEditSchema.safeParse({ nombre: "A", descripcion: "", posicion: 0 })
        .success,
    ).toBe(false);
    expect(
      categoriaEditSchema.safeParse({ nombre: "A", descripcion: "", posicion: 1.5 })
        .success,
    ).toBe(false);
    expect(
      categoriaEditSchema.safeParse({ nombre: "A", descripcion: "", posicion: -1 })
        .success,
    ).toBe(false);
    expect(
      categoriaEditSchema.safeParse({ nombre: "A", descripcion: "", posicion: 1000 })
        .success,
    ).toBe(false);
  });

  it("rechaza posiciones que no son número (NaN del input manipulado)", () => {
    expect(
      categoriaEditSchema.safeParse({ nombre: "A", descripcion: "", posicion: Number("basura") })
        .success,
    ).toBe(false);
  });
});

/* ============================================================================
 * Slug: palabra reservada y forma
 * ==========================================================================*/

describe("slugDeCategoriaValido", () => {
  it("acepta un slug kebab-case de una familia real o nueva", () => {
    expect(slugDeCategoriaValido("veladoras")).toBe(true);
    expect(slugDeCategoriaValido("amuletos-y-talismanes")).toBe(true);
  });

  it("RECHAZA la palabra reservada «todas» (es el default de los filtros)", () => {
    expect(slugDeCategoriaValido("todas")).toBe(false);
  });

  it("rechaza vacío y slugs mal formados", () => {
    expect(slugDeCategoriaValido("")).toBe(false);
    expect(slugDeCategoriaValido("Otras")).toBe(false);
    expect(slugDeCategoriaValido("con espacios")).toBe(false);
    expect(slugDeCategoriaValido("-al-reves-")).toBe(false);
  });
});

/* ============================================================================
 * Posición y conteo
 * ==========================================================================*/

describe("calcularSiguientePosicion", () => {
  it("con la tabla vacía arranca en 1", () => {
    expect(calcularSiguientePosicion([])).toBe(1);
  });

  it("es MAX+1 (no «cantidad+1»: los huecos no importan)", () => {
    expect(calcularSiguientePosicion([1, 2, 7])).toBe(8);
    expect(calcularSiguientePosicion([3, 1])).toBe(4);
  });
});

describe("contarProductosPorCategoria", () => {
  const productos = [
    { category: "veladoras", status: "published" },
    { category: "veladoras", status: "published" },
    { category: "veladoras", status: "retired" },
    { category: "lociones", status: "retired" },
    { category: "amuletos", status: "published" },
  ] as const;

  it("separa publicados de retirados por familia", () => {
    const conteos = contarProductosPorCategoria(productos);
    expect(conteos.get("veladoras")).toEqual({ publicados: 2, retirados: 1 });
    expect(conteos.get("lociones")).toEqual({ publicados: 0, retirados: 1 });
    expect(conteos.get("amuletos")).toEqual({ publicados: 1, retirados: 0 });
  });

  it("una familia sin fichas no aparece (get → undefined)", () => {
    const conteos = contarProductosPorCategoria(productos);
    expect(conteos.get("hierbas-y-preparados")).toBeUndefined();
  });
});

describe("textoDeConteo", () => {
  it("sin fichas lo dice claro (es la única familia que se puede borrar)", () => {
    expect(textoDeConteo(0, 0)).toBe("Sin productos");
  });

  it("cuenta en singular y plural", () => {
    expect(textoDeConteo(1, 0)).toBe("1 producto");
    expect(textoDeConteo(3, 0)).toBe("3 productos");
  });

  it("separa los retirados del total (formato del panel: «·»)", () => {
    expect(textoDeConteo(2, 1)).toBe("3 productos · 1 retirado");
    expect(textoDeConteo(2, 2)).toBe("4 productos · 2 retirados");
  });
});

/* ============================================================================
 * Mensajes PRG del banner (allowlist + composición)
 * ==========================================================================*/

describe("mensajeOkDesdeParams", () => {
  it("traduce las tres claves de éxito (creada|guardada|eliminada)", () => {
    expect(mensajeOkDesdeParams({ ok: "creada" })).toContain("creada");
    expect(mensajeOkDesdeParams({ ok: "guardada" })).toContain("Cambios guardados");
    expect(mensajeOkDesdeParams({ ok: "eliminada" })).toContain("eliminada");
  });

  it("ignora claves basura (allowlist, como MENSAJES_OK de /admin)", () => {
    expect(mensajeOkDesdeParams({ ok: "creado" })).toBeNull();
    expect(mensajeOkDesdeParams({ ok: "cualquier-cosa" })).toBeNull();
    expect(mensajeOkDesdeParams({})).toBeNull();
  });

  it("usa el primer valor si el parámetro viene repetido", () => {
    expect(mensajeOkDesdeParams({ ok: ["creada", "guardada"] })).toContain(
      "creada",
    );
  });
});

describe("mensajeErrorDesdeParams", () => {
  it("traduce las claves estáticas (duplicado, reservada, red…)", () => {
    expect(mensajeErrorDesdeParams({ error: "duplicado" })).toContain(
      "Ya existe una familia",
    );
    expect(mensajeErrorDesdeParams({ error: "reservada" })).toContain(
      "palabra reservada",
    );
    expect(mensajeErrorDesdeParams({ error: "red" })).toContain("conectar");
  });

  it("ignora claves basura", () => {
    expect(mensajeErrorDesdeParams({ error: "no-se-que" })).toBeNull();
    expect(mensajeErrorDesdeParams({})).toBeNull();
  });

  it("«con-productos» compone slug y conteo exactos", () => {
    const mensaje = mensajeErrorDesdeParams({
      error: "con-productos",
      slug: "veladoras",
      productos: "3",
    });
    expect(mensaje).toContain("«veladoras»");
    expect(mensaje).toContain("3 productos");
    expect(mensaje).toContain("Muévelos o elimínalos primero");
  });

  it("«con-productos» usa singular cuando hay una sola ficha", () => {
    const mensaje = mensajeErrorDesdeParams({
      error: "con-productos",
      slug: "lociones",
      productos: "1",
    });
    expect(mensaje).toContain("1 producto (incluyendo retirados)");
  });

  it("«con-productos» sin conteo válido no inventa cifras (carrera de la FK)", () => {
    const mensaje = mensajeErrorDesdeParams({ error: "con-productos" });
    expect(mensaje).toContain("todavía tiene productos asignados");
    expect(mensaje).not.toMatch(/\d/);
  });

  it("un conteo que no es entero positivo se ignora (basura de URL)", () => {
    expect(
      mensajeErrorDesdeParams({
        error: "con-productos",
        slug: "x",
        productos: "abc",
      }),
    ).not.toContain("abc");
    expect(
      mensajeErrorDesdeParams({
        error: "con-productos",
        slug: "x",
        productos: "0",
      }),
    ).not.toContain("0 productos");
  });
});

/* ============================================================================
 * Echo-back del formulario
 * ==========================================================================*/

describe("echoCategoriaDesdeParams", () => {
  it("recupera lo tipeado para re-llenar el formulario", () => {
    const eco = echoCategoriaDesdeParams({
      nombre: "Amuletos y talismanes",
      descripcion: "Una línea para el inicio.",
      posicion: "8",
    });
    expect(eco).toEqual({
      nombre: "Amuletos y talismanes",
      descripcion: "Una línea para el inicio.",
      posicion: "8",
    });
  });

  it("sin parámetros vuelve todo vacío (el form arranca limpio)", () => {
    expect(echoCategoriaDesdeParams({})).toEqual({
      nombre: "",
      descripcion: "",
      posicion: "",
    });
  });

  it("usa el primer valor si el parámetro viene repetido", () => {
    const eco = echoCategoriaDesdeParams({ nombre: ["A", "B"] });
    expect(eco.nombre).toBe("A");
  });

  it("recorta a los topes del zod: una URL gigante no entra al render", () => {
    const eco = echoCategoriaDesdeParams({
      nombre: "x".repeat(500),
      descripcion: "y".repeat(2000),
      posicion: "12345678901234",
    });
    expect(eco.nombre).toHaveLength(80);
    expect(eco.descripcion).toHaveLength(300);
    expect(eco.posicion).toHaveLength(8);
  });
});
