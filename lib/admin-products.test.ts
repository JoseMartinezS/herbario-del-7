import { describe, expect, it, vi } from "vitest";
import {
  calculateNextPosition,
  isAdminProductRow,
  isUuid,
  mapRowToAdminProduct,
  type AdminProductRow,
} from "./admin-products";

/**
 * Tests de la parte PURA de la capa de datos del panel (F2.3): guardilla
 * de filas, mapeo snake→camel, cálculo de posición y forma de UUID.
 *
 * Lo que NO está acá, a propósito (mismo criterio que F2.1/F2.2):
 * listAdminProducts/getAdminProductById/slugExists/getNextPosition
 * dependen de @supabase/ssr + cookies de sesión + red. Su contrato real
 * lo cubre el E2E de admin y el smoke del dueño contra el panel.
 */

const STORAGE_URL =
  "https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products";

/** Fila REAL del panel (con id), snake_case como llega de PostgREST. */
const filaValida: AdminProductRow = {
  id: "b019bd19-1111-4222-8333-444455556666",
  slug: "veladoras-preparadas",
  name: "Veladoras Preparadas",
  short_description:
    "Veladoras ya preparadas con hierbas y esencias para una intención específica.",
  description: "Párrafo uno.\n\nPárrafo dos.",
  category: "veladoras",
  price: null,
  image: `${STORAGE_URL}/veladoras-preparadas.jpg`,
  featured: true,
  status: "published",
  position: 3,
};

describe("isAdminProductRow", () => {
  it("debería aceptar una fila válida published", () => {
    expect(isAdminProductRow(filaValida)).toBe(true);
  });

  it("debería aceptar una fila retired (el panel las ve: retirar es reversible)", () => {
    expect(isAdminProductRow({ ...filaValida, status: "retired" })).toBe(true);
  });

  it("debería rechazar filas sin id (el panel edita por id)", () => {
    const { id, ...sinId } = filaValida;
    expect(id).toBeDefined(); // sanity de la fixture
    expect(isAdminProductRow(sinId)).toBe(false);
  });

  it("debería rechazar status inventados (draft/borrador)", () => {
    expect(
      isAdminProductRow({ ...filaValida, status: "draft" }),
    ).toBe(false);
  });

  it("debería heredar el rechazo estructural de isProductRow (F2.1)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(warn).not.toHaveBeenCalled();
    // precio negativo: isProductRow ya la declaraba inválida
    expect(isAdminProductRow({ ...filaValida, price: -10 })).toBe(false);
    // slug que rompe el patrón kebab
    expect(isAdminProductRow({ ...filaValida, slug: "Mal Kebab" })).toBe(false);
    expect(isAdminProductRow("no soy un objeto")).toBe(false);
    expect(isAdminProductRow(null)).toBe(false);
  });
});

describe("mapRowToAdminProduct", () => {
  it("debería mapear snake_case → camelCase conservando id, status y position", () => {
    const product = mapRowToAdminProduct(filaValida);
    expect(product).toEqual({
      id: filaValida.id,
      slug: "veladoras-preparadas",
      name: "Veladoras Preparadas",
      shortDescription: filaValida.short_description,
      description: filaValida.description,
      category: "veladoras",
      price: null,
      image: `${STORAGE_URL}/veladoras-preparadas.jpg`,
      featured: true,
      status: "published",
      position: 3,
    });
  });

  it("debería devolver null si la categoría no es de las 7", () => {
    expect(mapRowToAdminProduct({ ...filaValida, category: "otros" })).toBeNull();
  });
});

describe("calculateNextPosition (position automática al crear)", () => {
  it("debería devolver MAX+1 con posiciones existentes", () => {
    expect(calculateNextPosition([1, 2, 3])).toBe(4);
    expect(calculateNextPosition([10, 2, 5])).toBe(11); // desorden no importa
  });

  it("debería arrancar en 1 con la tabla vacía", () => {
    expect(calculateNextPosition([])).toBe(1);
  });

  it("debería devolver 11 si hay un solo producto en posición 10", () => {
    expect(calculateNextPosition([10])).toBe(11);
  });
});

describe("isUuid", () => {
  it("debería aceptar UUIDs (mayúsculas o minúsculas)", () => {
    expect(isUuid(filaValida.id)).toBe(true);
    expect(isUuid(filaValida.id.toUpperCase())).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
  });

  it("debería rechazar cualquier otra cosa (slugs, números, basura)", () => {
    expect(isUuid("veladoras-parafina")).toBe(false);
    expect(isUuid("123")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("b019bd19-1111-4222-8333-44445555666")).toBe(false); // largo mal
  });
});
