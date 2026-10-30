import { expect, test, type Page } from "@playwright/test";

/** URL de WhatsApp del negocio (content/business.ts, BUSINESS.whatsapp.url). */
const WHATSAPP_URL = "https://wa.me/5218661647442";

/**
 * Parchea window.open ANTES de que cargue la página: al enviar el
 * formulario, el navegador NUNCA navega a wa.me de verdad. Las URLs
 * que "abriría" quedan registradas en window.__waOpened para los asserts.
 */
async function interceptarWindowOpen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as Window & { __waOpened?: string[] };
    w.__waOpened = [];
    w.open = ((url?: string | URL) => {
      w.__waOpened?.push(String(url));
      return null;
    }) as typeof window.open;
  });
}

/** Lee las URLs registradas por el window.open parcheado. */
async function urlsAbiertas(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      (window as Window & { __waOpened?: string[] }).__waOpened ?? [],
  );
}

test.describe("Formulario de contacto", () => {
  test("el submit vacío muestra los errores en español y no abre nada", async ({
    page,
  }) => {
    await interceptarWindowOpen(page);
    await page.goto("/contacto");

    await page.getByRole("button", { name: "Enviar por WhatsApp" }).click();

    // Errores visibles tal cual los define el schema zod del ContactForm.
    await expect(
      page.getByText("Ingresa tu nombre (al menos 2 letras)."),
    ).toBeVisible();
    await expect(
      page.getByText("Cuéntanos un poco más (al menos 10 caracteres)."),
    ).toBeVisible();
    // El teléfono es opcional: no debe aparecer su error.
    await expect(
      page.getByText("Ingresa entre 10 y 15 dígitos, sin espacios ni guiones."),
    ).toHaveCount(0);

    // Y window.open jamás se llamó: no se abrió WhatsApp.
    expect(await urlsAbiertas(page)).toHaveLength(0);
    // El formulario sigue en pantalla (no hay confirmación de envío).
    await expect(
      page.getByText("Listo: tu mensaje se abrió en WhatsApp."),
    ).toHaveCount(0);
  });

  test("el submit válido abre WhatsApp con el mensaje compuesto", async ({
    page,
  }) => {
    await interceptarWindowOpen(page);
    await page.goto("/contacto");

    await page.getByLabel("Nombre", { exact: true }).fill("Juan Pérez");
    await page
      .getByLabel("Mensaje")
      .fill("Me interesa la ruda fresca, ¿la tienen en existencia?");

    await page.getByRole("button", { name: "Enviar por WhatsApp" }).click();

    // La composición exacta del mensaje (components/ContactForm.tsx).
    const texto = "Hola, soy Juan Pérez. Me interesa la ruda fresca, ¿la tienen en existencia?";
    const urlEsperada = `${WHATSAPP_URL}?text=${encodeURIComponent(texto)}`;

    // Confirmación visible al usuario…
    await expect(
      page.getByText("Listo: tu mensaje se abrió en WhatsApp."),
    ).toBeVisible();

    // …y la URL abierta es la esperada (una sola, sin popup real).
    expect(await urlsAbiertas(page)).toEqual([urlEsperada]);
  });
});
