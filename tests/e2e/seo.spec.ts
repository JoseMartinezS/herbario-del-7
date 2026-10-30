import { expect, test } from "@playwright/test";

/** Slugs de las 10 fichas de producto (content/products.json). */
const SLUGS_PRODUCTOS: readonly string[] = [
  "veladora-blanca-7-dias",
  "veladora-roja-7-dias",
  "ruda-fresca",
  "te-manzanilla-tila",
  "agua-san-miguel",
  "locion-ruda",
  "capsulas-ajo",
  "shampoo-sabila-romero",
  "jabon-miel-avena",
  "copal-blanco",
];

/** Las 8 rutas fijas del sitio (app/sitemap.ts, paginasFijas). */
const RUTAS_FIJAS: readonly string[] = [
  "/",
  "/nosotros",
  "/catalogo",
  "/ubicacion",
  "/contacto",
  "/privacidad",
  "/terminos",
  "/cookies",
];

test.describe("SEO servido", () => {
  test("sitemap.xml incluye las 8 rutas fijas y las 10 fichas de producto", async ({
    request,
  }) => {
    const respuesta = await request.get("/sitemap.xml");
    expect(respuesta.status()).toBe(200);
    const cuerpo = await respuesta.text();

    // Se comparan PATHS (no dominios absolutos) para ser robustos ante
    // NEXT_PUBLIC_SITE_URL apuntando a otro dominio en el entorno.
    const paths = [...cuerpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => new URL(match[1]).pathname,
    );

    const esperados = [
      ...RUTAS_FIJAS,
      ...SLUGS_PRODUCTOS.map((slug) => `/catalogo/${slug}`),
    ];
    expect(paths.sort()).toEqual([...esperados].sort());
    // /admin es un panel interno y NO debe indexarse.
    expect(paths).not.toContain("/admin");
  });

  test("robots.txt bloquea /admin y publica el sitemap", async ({ request }) => {
    const respuesta = await request.get("/robots.txt");
    expect(respuesta.status()).toBe(200);
    const cuerpo = await respuesta.text();
    expect(cuerpo).toMatch(/Disallow:\s*\/admin/);
    expect(cuerpo).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/);
  });

  test("el JSON-LD del home expone la ficha schema.org Store completa", async ({
    page,
  }) => {
    await page.goto("/");

    const contenido = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(contenido, "el script JSON-LD debe tener contenido").toBeTruthy();

    // Forma del schema según components/JsonLd.tsx (buildStoreSchema).
    interface StoreSchema {
      "@type": string;
      name: string;
      telephone: string;
      email: string;
      sameAs: string[];
      openingHoursSpecification: Array<{
        "@type": string;
        dayOfWeek: string[];
        opens: string;
        closes: string;
      }>;
    }
    const json = JSON.parse(contenido ?? "") as StoreSchema;

    expect(json["@type"]).toBe("Store");
    expect(json.name).toBe("Herbario Del 7");
    expect(json.telephone).toBe("+528666357585");
    expect(json.email).toBe("caty5511@hotmail.com");
    expect(json.sameAs).toEqual([
      "https://www.facebook.com/HerbarioDel7",
      "https://www.instagram.com/herbariodel7/",
    ]);
    // Lunes-sábado dos turnos + domingo uno: 3 especificaciones.
    expect(json.openingHoursSpecification.length).toBeGreaterThanOrEqual(3);
    for (const spec of json.openingHoursSpecification) {
      expect(spec["@type"]).toBe("OpeningHoursSpecification");
      expect(spec.dayOfWeek.length).toBeGreaterThan(0);
      expect(spec.opens).toMatch(/^\d{2}:\d{2}$/);
      expect(spec.closes).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  test("cada página principal sirve un título único", async ({ page }) => {
    const titulos: string[] = [];
    for (const ruta of RUTAS_FIJAS) {
      await page.goto(ruta);
      const titulo = await page.title();
      expect(titulo, `la ruta ${ruta} debe tener título`).not.toBe("");
      titulos.push(titulo);
    }
    const unicos = new Set(titulos);
    expect(
      unicos.size,
      `hay títulos duplicados: [${titulos.join(" | ")}]`,
    ).toBe(titulos.length);
  });
});
