import { expect, test } from "@playwright/test";

/** URL de WhatsApp del negocio (content/business.ts, BUSINESS.whatsapp.url). */
const WHATSAPP_URL = "https://wa.me/5218661647442";

/** Páginas principales: el botón flotante debe existir en todas. */
const PAGINAS_PRINCIPALES: readonly string[] = [
  "/",
  "/nosotros",
  "/catalogo",
  "/ubicacion",
  "/contacto",
  "/privacidad",
];

/** Los 5 links de la navegación (components/Header.tsx, NAV_LINKS). */
const LINKS_NAV: readonly string[] = [
  "Inicio",
  "Nosotros",
  "Catálogo",
  "Ubicación",
  "Contacto",
];

/** Links legales del footer (components/Footer.tsx, LEGAL_LINKS). */
const LINKS_LEGALES: ReadonlyArray<{ nombre: string; href: string }> = [
  { nombre: "Privacidad", href: "/privacidad" },
  { nombre: "Términos", href: "/terminos" },
  { nombre: "Cookies", href: "/cookies" },
];

test.describe("Layout compartido", () => {
  test("el botón flotante de WhatsApp está visible en todas las páginas principales", async ({
    page,
  }) => {
    for (const ruta of PAGINAS_PRINCIPALES) {
      await page.goto(ruta);
      const flotante = page.getByRole("link", {
        name: "Contactar por WhatsApp",
      });
      await expect(flotante, `botón flotante visible en ${ruta}`).toBeVisible();
      await expect(flotante, `href en ${ruta}`).toHaveAttribute(
        "href",
        WHATSAPP_URL,
      );
    }
  });

  test("el footer publica el NAP completo y los enlaces legales y sociales", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    // NAP (los formatos display exactos de content/business.ts).
    await expect(footer.getByText("Presidente Carranza #119")).toBeVisible();
    await expect(footer.getByText("+52 866 635 7585")).toBeVisible();
    await expect(footer.getByText("caty5511@hotmail.com")).toBeVisible();

    // Legales.
    for (const { nombre, href } of LINKS_LEGALES) {
      await expect(footer.getByRole("link", { name: nombre })).toHaveAttribute(
        "href",
        href,
      );
    }

    // Redes sociales con sus hrefs reales.
    await expect(
      footer.getByRole("link", { name: "Facebook de Herbario Del 7" }),
    ).toHaveAttribute("href", "https://www.facebook.com/HerbarioDel7");
    await expect(
      footer.getByRole("link", { name: "Instagram de Herbario Del 7" }),
    ).toHaveAttribute("href", "https://www.instagram.com/herbariodel7/");
  });

  test("el header muestra la navegación de escritorio con los 5 links", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav).toBeVisible();
    for (const etiqueta of LINKS_NAV) {
      await expect(
        nav.getByRole("link", { name: etiqueta, exact: true }),
      ).toBeVisible();
    }
  });
});

test.describe("Menú móvil (viewport 375×667)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("la hamburguesa abre el menú, navega y el menú queda cerrado", async ({
    page,
  }) => {
    await page.goto("/");

    // La hamburguesa cambia de aria-label según su estado; el regex
    // coincide con "Abrir menú de navegación" y "Cerrar menú de navegación".
    const hamburguesa = page.getByRole("button", { name: /menú de navegación/ });
    await expect(hamburguesa).toBeVisible();
    await expect(hamburguesa).toHaveAttribute("aria-expanded", "false");

    // En móvil la navegación de escritorio está oculta (hidden md:block).
    await expect(
      page.getByRole("navigation", { name: "Principal" }),
    ).toBeHidden();

    await hamburguesa.click();

    await expect(hamburguesa).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("navigation", { name: "Menú móvil" });
    await expect(menu).toBeVisible();
    for (const etiqueta of LINKS_NAV) {
      await expect(
        menu.getByRole("link", { name: etiqueta, exact: true }),
      ).toBeVisible();
    }

    // Navegar desde el menú: llega al catálogo y el menú se cierra solo
    // (useEffect sobre pathname en Header.tsx).
    await menu
      .getByRole("link", { name: "Catálogo", exact: true })
      .click();
    await expect(page).toHaveURL("/catalogo");
    await expect(
      page.getByRole("heading", { level: 1, name: "Catálogo del herbolario" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Menú móvil" })).toBeHidden();
    await expect(hamburguesa).toHaveAttribute("aria-expanded", "false");
  });
});
