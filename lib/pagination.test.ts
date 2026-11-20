import { describe, expect, it } from "vitest";
import {
  ADMIN_POR_PAGINA,
  CATALOGO_POR_PAGINA,
  SALTO_PAGINAS,
  buildPageHref,
  calcularPaginas,
  clampPage,
  paginar,
  parsePageParam,
} from "./pagination";

/**
 * Tests de la parte PURA de la paginación: parseo del searchParam `page`
 * con default sano, clamp al rango real de la vista, rebanado en
 * memoria, hrefs con la convención no-defaults y la ventana de números
 * del nav.
 *
 * Todo acá es función pura sobre números y arrays planos: cero React,
 * cero red (misma convención que admin-filters.test.ts).
 */

/** Lista de prueba: 26 items para tener páginas llenas y una parcial. */
function lista(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

describe("parsePageParam", () => {
  it("sin parámetro cae a la página 1", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("")).toBe(1);
  });

  it("basura textual cae a la página 1", () => {
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("dos")).toBe(1);
    expect(parsePageParam("1y2")).toBe(1);
  });

  it("cero y negativos caen a la página 1", () => {
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-1")).toBe(1);
    expect(parsePageParam("-99")).toBe(1);
  });

  it("fracciones no enteras caen a la página 1", () => {
    expect(parsePageParam("2.5")).toBe(1);
    expect(parsePageParam("0.9")).toBe(1);
  });

  it("un número entero válido se respeta", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam("12")).toBe(12);
  });

  it("un parámetro repetido usa el primer valor (aunque sea basura)", () => {
    expect(parsePageParam(["3", "9"])).toBe(3);
    expect(parsePageParam(["abc", "2"])).toBe(1);
    expect(parsePageParam([])).toBe(1);
  });
});

describe("clampPage", () => {
  it("dentro del rango no se toca", () => {
    expect(clampPage(1, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(3, 3)).toBe(3);
  });

  it("una página más allá de la última se acota a la última", () => {
    expect(clampPage(4, 3)).toBe(3);
    expect(clampPage(99, 3)).toBe(3);
  });

  it("una página menor que 1 se acota a 1", () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(-5, 3)).toBe(1);
  });

  it("con 0 páginas (lista vacía) devuelve 1, nunca menos", () => {
    expect(clampPage(1, 0)).toBe(1);
    expect(clampPage(7, 0)).toBe(1);
  });
});

describe("paginar", () => {
  it("lista vacía: 0 páginas, página 1 y rebanada vacía", () => {
    expect(paginar([], 1, ADMIN_POR_PAGINA)).toEqual({
      itemsPagina: [],
      totalPaginas: 0,
      paginaActual: 1,
    });
  });

  it("página 1 devuelve los primeros N items", () => {
    const { itemsPagina, totalPaginas, paginaActual } = paginar(
      lista(26),
      1,
      12,
    );
    expect(itemsPagina).toEqual(lista(12));
    expect(totalPaginas).toBe(3);
    expect(paginaActual).toBe(1);
  });

  it("página 2 rebanada del item 13 al 24", () => {
    const { itemsPagina, paginaActual } = paginar(lista(26), 2, 12);
    expect(itemsPagina).toEqual(lista(12).map((n) => n + 12));
    expect(paginaActual).toBe(2);
  });

  it("la última página lleva solo el resto", () => {
    const { itemsPagina, paginaActual } = paginar(lista(26), 3, 12);
    expect(itemsPagina).toEqual([25, 26]);
    expect(paginaActual).toBe(3);
  });

  it("múltiplo exacto no fabrica una página de más", () => {
    const { itemsPagina, totalPaginas, paginaActual } = paginar(
      lista(24),
      3, // solo hay 2 páginas (24 = 12 × 2)
      12,
    );
    expect(totalPaginas).toBe(2);
    expect(paginaActual).toBe(2);
    expect(itemsPagina).toEqual(lista(12).map((n) => n + 12));
  });

  it("page fuera de rango renderiza la última página válida", () => {
    const { itemsPagina, totalPaginas, paginaActual } = paginar(
      lista(26),
      99,
      12,
    );
    expect(totalPaginas).toBe(3);
    expect(paginaActual).toBe(3);
    expect(itemsPagina).toEqual([25, 26]);
  });

  it("un catálogo de una sola página acota page=2 a la 1 y muestra todo", () => {
    // El escenario del e2e de hoy: 15 productos, 18 por página.
    const { itemsPagina, totalPaginas, paginaActual } = paginar(
      lista(15),
      2,
      CATALOGO_POR_PAGINA,
    );
    expect(totalPaginas).toBe(1);
    expect(paginaActual).toBe(1);
    expect(itemsPagina).toEqual(lista(15));
  });

  it("no muta la lista de entrada", () => {
    const entrada = lista(26);
    paginar(entrada, 2, 12);
    expect(entrada).toEqual(lista(26));
    expect(entrada.length).toBe(26);
  });

  it("porPagina roto tiene piso de 1: nada de páginas infinitas", () => {
    const { itemsPagina, totalPaginas } = paginar(lista(3), 1, 0);
    expect(totalPaginas).toBe(3);
    expect(itemsPagina).toEqual([1]);
  });
});

describe("buildPageHref", () => {
  it("la página 1 no viaja en la URL (baseHref tal cual)", () => {
    expect(buildPageHref("/admin", 1)).toBe("/admin");
    expect(buildPageHref("/catalogo?categoria=veladoras", 1)).toBe(
      "/catalogo?categoria=veladoras",
    );
  });

  it("page inválido tampoco viaja (misma convención que la página 1)", () => {
    expect(buildPageHref("/admin", 0)).toBe("/admin");
    expect(buildPageHref("/admin", -2)).toBe("/admin");
  });

  it("baseHref sin query agrega ?page", () => {
    expect(buildPageHref("/admin", 2)).toBe("/admin?page=2");
    expect(buildPageHref("/catalogo", 3)).toBe("/catalogo?page=3");
  });

  it("baseHref con query agrega &page (vista ya filtrada)", () => {
    expect(buildPageHref("/admin?estado=retirados", 2)).toBe(
      "/admin?estado=retirados&page=2",
    );
    expect(buildPageHref("/catalogo?categoria=veladoras", 2)).toBe(
      "/catalogo?categoria=veladoras&page=2",
    );
  });

  it("respeta la query codificada del buscador sin tocarla", () => {
    // adminProductsHref codifica los espacios como %20: page se appendea
    // después, sin re-codificar lo que ya venía.
    expect(buildPageHref("/admin?q=t%C3%A9%20verde&orden=nombre", 2)).toBe(
      "/admin?q=t%C3%A9%20verde&orden=nombre&page=2",
    );
  });
});

describe("calcularPaginas", () => {
  it("con 7 páginas o menos muestra todos los números", () => {
    expect(calcularPaginas(1, 1)).toEqual([1]);
    expect(calcularPaginas(1, 2)).toEqual([1, 2]);
    expect(calcularPaginas(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("ventana del borde izquierdo: actual 1 pega la ventana al 1", () => {
    expect(calcularPaginas(1, 20)).toEqual([1, 2, SALTO_PAGINAS, 20]);
  });

  it("ventana del borde derecho: actual en la última pega al final", () => {
    expect(calcularPaginas(20, 20)).toEqual([1, SALTO_PAGINAS, 19, 20]);
  });

  it("al medio: primera + ventana de 3 + elipsis + última", () => {
    expect(calcularPaginas(10, 20)).toEqual([
      1,
      SALTO_PAGINAS,
      9,
      10,
      11,
      SALTO_PAGINAS,
      20,
    ]);
  });

  it("la ventana que toca un borde no deja elipsis muertos", () => {
    // Con 8 páginas y actual 2: la ventana (2, 3) pega con el 1, así que
    // solo salta a la derecha.
    expect(calcularPaginas(2, 8)).toEqual([1, 2, 3, SALTO_PAGINAS, 8]);
    // Y al revés, actual 7 con 8 páginas: salto a la izquierda pegado al 8.
    expect(calcularPaginas(7, 8)).toEqual([1, SALTO_PAGINAS, 6, 7, 8]);
  });

  it("máximo 5 cifras visibles (primera y última incluidas)", () => {
    const paginas = calcularPaginas(50, 100).filter(
      (p) => p !== SALTO_PAGINAS,
    );
    expect(paginas).toEqual([1, 49, 50, 51, 100]);
    expect(paginas.length).toBeLessThanOrEqual(5);
  });
});

describe("constantes de páginas por vista", () => {
  it("admin 12 por página y catálogo 18 (decisión cerrada del dueño)", () => {
    // Si estos números cambian, es una decisión de producto nueva: no
    // un refactor silencioso.
    expect(ADMIN_POR_PAGINA).toBe(12);
    expect(CATALOGO_POR_PAGINA).toBe(18);
  });
});
