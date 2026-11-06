import { expect, test } from "@playwright/test";

/**
 * Rutas principales: todas responden OK y renderizan su h1 visible.
 * El texto exacto del h1 funciona como red de regresión del contenido.
 * (Fuente de verdad de los textos: cada app/<ruta>/page.tsx.)
 */
const RUTAS_PRINCIPALES: ReadonlyArray<{ ruta: string; h1: string }> = [
  { ruta: "/", h1: "Herbario Del 7" },
  { ruta: "/nosotros", h1: "Nosotros" },
  { ruta: "/catalogo", h1: "Catálogo del herbolario" },
  { ruta: "/catalogo/veladoras-preparadas", h1: "Veladoras Preparadas" },
  { ruta: "/ubicacion", h1: "Ubicación y horarios" },
  { ruta: "/contacto", h1: "Contacto" },
  { ruta: "/privacidad", h1: "Política de privacidad" },
  { ruta: "/terminos", h1: "Términos y condiciones" },
  { ruta: "/cookies", h1: "Política de cookies" },
  { ruta: "/admin", h1: "Panel de administración" },
];

test.describe("Rutas principales", () => {
  for (const { ruta, h1 } of RUTAS_PRINCIPALES) {
    test(`"${ruta}" responde 200 y muestra su h1`, async ({ page }) => {
      const respuesta = await page.goto(ruta);
      expect(respuesta, `la ruta ${ruta} debe responder`).not.toBeNull();
      expect(respuesta?.status(), `la ruta ${ruta} debe dar 200`).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: h1 }),
      ).toBeVisible();
    });
  }

  test("/admin se marca noindex para buscadores", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("una ficha inexistente devuelve 404 con la página personalizada", async ({
    page,
  }) => {
    const respuesta = await page.goto("/catalogo/no-existe-xyz");
    expect(respuesta?.status()).toBe(404);
    // Texto exacto según app/not-found.tsx.
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Esta página se perdió entre las hierbas",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Puede que el enlace haya cambiado o que la página ya no exista."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Volver al inicio" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver catálogo" })).toBeVisible();
  });
});
