import { describe, expect, it } from "vitest";
import { isValidSlug, slugify, SLUG_REGEX } from "./slugify";

/**
 * Tests de slugify (F2.3): la función que arma la URL de la ficha desde
 * el nombre que escribe el dueño. El contrato duro: el resultado SIEMPRE
 * es "" o matchea la regex de slug del schema/tabla — ninguna entrada
 * puede producir un slug inválido.
 */

/** Nombres reales del mostrador, con la forma esperada. */
const CASOS_REALES: ReadonlyArray<{ entrada: string; esperado: string }> = [
  { entrada: "Veladoras de Parafina", esperado: "veladoras-de-parafina" },
  { entrada: "Lágrimas de María", esperado: "lagrimas-de-maria" },
  { entrada: "Tés e Infusiones de la Casa", esperado: "tes-e-infusiones-de-la-casa" },
  { entrada: "Shampoos y Acondicionadores", esperado: "shampoos-y-acondicionadores" },
  { entrada: "Copal para Sahumerio", esperado: "copal-para-sahumerio" },
  { entrada: "Cápsulas y Productos Naturales", esperado: "capsulas-y-productos-naturales" },
];

describe("slugify: transliteración", () => {
  it("debería pasar minúsculas y acentos a base ASCII", () => {
    expect(slugify("ÁÉÍÓÚ")).toBe("aeiou");
    expect(slugify("áéíóú")).toBe("aeiou");
    expect(slugify("Baño Sagrado")).toBe("bano-sagrado"); // ñ → n
    expect(slugify("Pingüino")).toBe("pinguino"); // ü → u
  });

  it("debería convertir espacios y símbolos en guiones", () => {
    expect(slugify("Copal & resinas ¡al 100%!")).toBe("copal-resinas-al-100");
    expect(slugify("wiskeras_lociones")).toBe("wiskeras-lociones"); // guion bajo
    expect(slugify("7 días")).toBe("7-dias"); // números válidos en slug
  });

  it("debería colapsar separadores repetidos en un solo guion", () => {
    expect(slugify("a   --  b")).toBe("a-b");
    expect(slugify("  mucho    espacio  ")).toBe("mucho-espacio");
    expect(slugify("a-b--c---d")).toBe("a-b-c-d");
  });

  it("debería recortar guiones de los extremos", () => {
    expect(slugify("- Hola -")).toBe("hola");
    expect(slugify("---Yerbas---")).toBe("yerbas");
  });

  it("debería devolver \"\" para entradas sin letras ni números", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("¿?!")).toBe("");
    expect(slugify("---")).toBe("");
  });
});

describe("slugify: nombres reales del catálogo", () => {
  it.each(CASOS_REALES)("$entrada → $esperado", ({ entrada, esperado }) => {
    expect(slugify(entrada)).toBe(esperado);
  });
});

describe("slugify: contrato de la regex", () => {
  it("ninguna entrada tricky debería producir un slug inválido", () => {
    const entradas = [
      ...CASOS_REALES.map((c) => c.entrada),
      "Ñoño Qüiubo Güey",
      "  ---  mezcla  rara  !!!  ",
      "UPPER CASE TOTAL",
      "números 123 y símbolos #$%",
      "café, té y chocolate",
      "",
    ];
    for (const entrada of entradas) {
      const resultado = slugify(entrada);
      if (resultado !== "") {
        expect(resultado).toMatch(SLUG_REGEX);
      }
    }
  });

  it("todo lo que devuelve la tabla (y el schema) lo acepta isValidSlug", () => {
    expect(isValidSlug("veladoras-parafina")).toBe(true);
    expect(isValidSlug("7-dias")).toBe(true);
    expect(isValidSlug("lagrimas-de-maria")).toBe(true);
    // Invalidos: mayúsculas, guiones dobles, inicial/final en guion, vacío.
    expect(isValidSlug("Veladoras")).toBe(false);
    expect(isValidSlug("a--b")).toBe(false);
    expect(isValidSlug("-a")).toBe(false);
    expect(isValidSlug("a-")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});
