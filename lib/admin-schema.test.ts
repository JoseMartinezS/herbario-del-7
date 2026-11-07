import { describe, expect, it } from "vitest";
import {
  adminProductFieldsSchema,
  adminProductSchema,
  MAX_PRICE,
} from "./admin-schema";

/**
 * Tests del schema del panel (F2.3): los MISMOS gates del catálogo
 * (lib/schema.ts) + estado + imagen dual-mode. Si un gate cambia en
 * schema.ts, acá se refleja: por eso los casos se prueban contra este
 * schema completo y no contra el del JSON.
 */

const STORAGE_URL =
  "https://mmvifyolydrohrfffqtl.supabase.co/storage/v1/object/public/products";

/** Producto válido completo, con imagen del bucket. */
const productoValido = {
  slug: "veladoras-preparadas",
  name: "Veladoras Preparadas",
  shortDescription:
    "Veladoras ya preparadas con hierbas y esencias para una intención específica.",
  description: "Párrafo uno.\n\nPárrafo dos.",
  category: "veladoras",
  price: null,
  image: `${STORAGE_URL}/veladoras-preparadas.jpg`,
  featured: true,
  status: "published",
} as const;

describe("adminProductSchema: casos válidos", () => {
  it("debería aceptar un producto completo con imagen del bucket", () => {
    const parsed = adminProductSchema.safeParse(productoValido);
    expect(parsed.success).toBe(true);
  });

  it("debería aceptar la imagen como ruta local del JSON original", () => {
    const parsed = adminProductSchema.safeParse({
      ...productoValido,
      image: "/images/products/hierbas.svg",
    });
    expect(parsed.success).toBe(true);
  });

  it("debería aceptar status retired y featured false", () => {
    const parsed = adminProductSchema.safeParse({
      ...productoValido,
      status: "retired",
      featured: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("debería aceptar precio 0 (gratis ≠ consulta por WhatsApp)", () => {
    const parsed = adminProductSchema.safeParse({
      ...productoValido,
      price: 0,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("adminProductSchema: los mismos gates del catálogo", () => {
  it("shortDescription de más de 140 caracteres NO pasa", () => {
    const parsed = adminProductSchema.safeParse({
      ...productoValido,
      shortDescription: "a".repeat(141),
    });
    expect(parsed.success).toBe(false);
  });

  it("description de un solo párrafo (sin línea en blanco) NO pasa", () => {
    const parsed = adminProductSchema.safeParse({
      ...productoValido,
      description: "un solo párrafo largo",
    });
    expect(parsed.success).toBe(false);
  });

  it("categoría fuera de las 7 NO pasa", () => {
    const parsed = adminProductSchema.safeParse({
      ...productoValido,
      category: "otros",
    });
    expect(parsed.success).toBe(false);
  });

  it("precio negativo o con centavos NO pasa (entero ≥ 0 o null)", () => {
    expect(
      adminProductSchema.safeParse({ ...productoValido, price: -10 }).success,
    ).toBe(false);
    expect(
      adminProductSchema.safeParse({ ...productoValido, price: 45.5 }).success,
    ).toBe(false);
    expect(
      adminProductSchema.safeParse({ ...productoValido, price: MAX_PRICE }).success,
    ).toBe(true);
    expect(
      adminProductSchema.safeParse({ ...productoValido, price: MAX_PRICE + 1 })
        .success,
    ).toBe(false); // techo del numeric(10,2) de la tabla
  });

  it("slug que no es kebab-case NO pasa", () => {
    expect(
      adminProductSchema.safeParse({ ...productoValido, slug: "Mal Kebab" })
        .success,
    ).toBe(false);
  });

  it("name vacío NO pasa", () => {
    expect(
      adminProductSchema.safeParse({ ...productoValido, name: "" }).success,
    ).toBe(false);
  });
});

describe("adminProductSchema: lo que el panel agrega", () => {
  it("status inventado NO pasa (solo published/retired)", () => {
    const parsed = adminProductSchema.safeParse({
      ...productoValido,
      status: "draft",
    });
    expect(parsed.success).toBe(false);
  });

  it("imagen externa (ni bucket ni ruta local) NO pasa", () => {
    expect(
      adminProductSchema.safeParse({
        ...productoValido,
        image: "https://cdn.ejemplo.com/foto.webp",
      }).success,
    ).toBe(false);
    expect(
      adminProductSchema.safeParse({ ...productoValido, image: "" }).success,
    ).toBe(false);
    expect(
      adminProductSchema.safeParse({ ...productoValido, image: "/foto.jpg" })
        .success,
    ).toBe(false);
  });
});

describe("adminProductFieldsSchema (los campos que manda el form)", () => {
  it("debería validar los campos sin imagen ni estado", () => {
    const parsed = adminProductFieldsSchema.safeParse({
      slug: "copal-blanco",
      name: "Copal para Sahumerio",
      shortDescription: "Copal en grano para sahumerios.",
      description: "Uno.\n\nDos.",
      category: "sahumerios-e-inciensos",
      price: 60,
      featured: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("debería heredar los mismos mensajes de error (p. ej. el de 140)", () => {
    const parsed = adminProductFieldsSchema.safeParse({
      slug: "copal-blanco",
      name: "Copal",
      shortDescription: "a".repeat(141),
      description: "Uno.\n\nDos.",
      category: "sahumerios-e-inciensos",
      price: null,
      featured: false,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        "La descripción corta no debe pasar de 140 caracteres.",
      );
    }
  });
});
