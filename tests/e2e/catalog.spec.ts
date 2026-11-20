import { expect, test } from "@playwright/test";

/**
 * Selector de tarjetas de producto: son los links a fichas
 * (/catalogo/<slug>). Los chips del filtro apuntan a /catalogo?categoria=…
 * (sin slash tras "catalogo"), así que no colisionan con este selector.
 */
const TARJETA_PRODUCTO = 'a[href^="/catalogo/"]';

const PRODUCTO = "Veladoras Preparadas";

test.describe("Catálogo", () => {
  test("sin filtro muestra las 15 tarjetas y el contador total", async ({
    page,
  }) => {
    await page.goto("/catalogo");
    await expect(page.locator(TARJETA_PRODUCTO)).toHaveCount(15);
    await expect(page.getByText("15 productos", { exact: true })).toBeVisible();
  });

  test("el chip Veladoras filtra a 3 tarjetas y actualiza el contador", async ({
    page,
  }) => {
    await page.goto("/catalogo");
    // El nombre accesible del chip es "Veladoras 3" (etiqueta + conteo).
    await page.getByRole("link", { name: /^Veladoras/ }).click();

    await expect(page).toHaveURL(/\/catalogo\?categoria=veladoras$/);
    await expect(page.locator(TARJETA_PRODUCTO)).toHaveCount(3);
    await expect(
      page.getByText("3 productos en Veladoras", { exact: true }),
    ).toBeVisible();
  });

  test("el chip Todas devuelve a las 15 tarjetas", async ({ page }) => {
    await page.goto("/catalogo?categoria=veladoras");
    await expect(page.locator(TARJETA_PRODUCTO)).toHaveCount(3);

    await page.getByRole("link", { name: /^Todas/ }).click();

    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.locator(TARJETA_PRODUCTO)).toHaveCount(15);
    await expect(page.getByText("15 productos", { exact: true })).toBeVisible();
  });

  test(`la ficha de "${PRODUCTO}" tiene breadcrumb, CTA de WhatsApp y relacionados`, async ({
    page,
  }) => {
    await page.goto("/catalogo");
    await page
      .getByRole("link", { name: `Ver detalles de ${PRODUCTO}` })
      .click();

    await expect(page).toHaveURL("/catalogo/veladoras-preparadas");
    await expect(
      page.getByRole("heading", { level: 1, name: PRODUCTO }),
    ).toBeVisible();

    // Breadcrumb con link a Catálogo y item actual.
    const miga = page.getByRole("navigation", { name: "Ruta de navegación" });
    await expect(miga).toBeVisible();
    await expect(miga.getByRole("link", { name: "Catálogo" })).toHaveAttribute(
      "href",
      "/catalogo",
    );
    await expect(miga.getByText(PRODUCTO)).toBeVisible();

    // CTA de WhatsApp con el mensaje prellenado del producto (composición
    // exacta de app/catalogo/[slug]/page.tsx). El botón flotante y el del
    // footer no llevan ?text=, así que este selector es único para el CTA.
    const mensaje = `Hola, me interesa: ${PRODUCTO} (lo vi en el sitio web)`;
    const hrefEsperado = `https://wa.me/5218661647442?text=${encodeURIComponent(
      mensaje,
    )}`;
    const cta = page.locator('a[href^="https://wa.me/5218661647442?text="]');
    await expect(cta).toHaveAttribute("href", hrefEsperado);
    await expect(cta).toBeVisible();

    // Sección de relacionados (comparte familia con las otras dos veladoras).
    await expect(
      page.getByRole("heading", { name: "Más de Veladoras" }),
    ).toBeVisible();
    await expect(page.locator(TARJETA_PRODUCTO)).toHaveCount(2);
  });
});

test.describe("Paginación del catálogo", () => {
  test("con una sola página de catálogo no aparece el nav de paginación", async ({
    page,
  }) => {
    // products.json trae 15 productos y la página sirve 18 por página:
    // una sola página → el nav es null (no hay a dónde ir). Igual que
    // los tests de arriba, este depende del catálogo sembrado — cuando
    // crezca a 19+ productos, acá y en las 15 tarjetas se ajusta junto.
    const respuesta = await page.goto("/catalogo");
    expect(respuesta?.status()).toBe(200);
    await expect(page.locator(TARJETA_PRODUCTO)).toHaveCount(15);
    await expect(
      page.getByRole("navigation", { name: "Paginación" }),
    ).toHaveCount(0);
  });

  test("?page fuera de rango responde 200 y renderiza la última página válida", async ({
    page,
  }) => {
    // El clamp: ?page=2 con una sola página renderiza la página 1
    // (idéntica) — sin "sin coincidencias" falso por un link viejo.
    const respuesta = await page.goto("/catalogo?page=2");
    expect(respuesta?.status()).toBe(200);
    await expect(page.locator(TARJETA_PRODUCTO)).toHaveCount(15);
    await expect(
      page.getByRole("navigation", { name: "Paginación" }),
    ).toHaveCount(0);
  });
});
