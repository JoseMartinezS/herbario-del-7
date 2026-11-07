import { expect, test } from "@playwright/test";

/**
 * Panel admin (F2.2): protección con middleware + Supabase Auth.
 *
 * CI corre esta suite SIN credenciales reales y SIN env vars de Supabase:
 * el middleware es fail-closed, así que sin sesión (con o sin config) el
 * redirect a /admin/login se cumple igual. El login con credenciales
 * reales queda como SMOKE TEST DEL DUEÑO: se activa solo si el entorno
 * tiene ADMIN_EMAIL y ADMIN_PASSWORD (ver el último test).
 */

test.describe("Panel admin (protegido)", () => {
  test("GET /admin sin sesión responde 307 hacia /admin/login", async ({
    request,
  }) => {
    // Sin maxRedirects: 0 el contexto seguiría el redirect y veríamos el
    // 200 final; acá queremos ver el redirect DEL PORTERO tal cual es.
    const respuesta = await request.get("/admin", { maxRedirects: 0 });
    expect(respuesta.status()).toBe(307);
    expect(respuesta.headers()["location"]).toContain("/admin/login");
  });

  test("el redirect preserva la ruta original en ?next para volver tras el login", async ({
    page,
  }) => {
    await page.goto("/admin");
    // page.goto siguió el 307: terminamos en la puerta.
    await expect(page).toHaveURL(/\/admin\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/admin");
    await expect(
      page.getByRole("heading", { level: 1, name: "Entrar al panel" }),
    ).toBeVisible();
  });

  test("GET /admin/login responde 200 con el formulario de acceso", async ({
    page,
  }) => {
    const respuesta = await page.goto("/admin/login");
    expect(respuesta?.status()).toBe(200);
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Entrar" }),
    ).toBeEnabled();
  });

  test("las páginas de admin se marcan noindex para buscadores", async ({
    page,
  }) => {
    // La puerta es lo único servible sin sesión; el interior hereda el
    // mismo noindex en sus metadatos (y robots.txt lo bloquea aparte).
    await page.goto("/admin/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("la puerta no muestra registro ni recuperación de contraseña", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    // Una sola cuenta, creada desde el dashboard de Supabase (README).
    await expect(
      page.getByRole("link", { name: /registr|contraseña|recuper/i }),
    ).toHaveCount(0);
  });
});

/**
 * SMOKE TEST DEL DUEÑO (no corre en CI): login real contra Supabase Auth,
 * saludo con el email en el interior y cierre de sesión.
 *
 * Para correrlo localmente (con las env vars de Supabase activas en
 * .env.local y el dev server de Playwright):
 *
 *   $env:ADMIN_EMAIL = "la cuenta del dashboard"
 *   $env:ADMIN_PASSWORD = "su contraseña"
 *   npx playwright test tests/e2e/admin.spec.ts
 *
 * La cuenta es la única que existe: la creada en el dashboard de Supabase
 * (Authentication → Users). Si ese usuario no tiene el email confirmado,
 * el login falla con "Email not confirmed" — el fix también es desde el
 * dashboard (ver README, sección "Panel de administración").
 */
const emailAdmin = process.env.ADMIN_EMAIL;
const passwordAdmin = process.env.ADMIN_PASSWORD;

test.describe("Smoke del dueño: login real (requiere credenciales)", () => {
  test.skip(
    !emailAdmin || !passwordAdmin,
    "requiere ADMIN_EMAIL y ADMIN_PASSWORD en el entorno",
  );

  test("entrar con la cuenta real, ver el interior y cerrar sesión", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page
      .getByLabel("Correo electrónico")
      .fill(emailAdmin ?? "");
    await page.getByLabel("Contraseña").fill(passwordAdmin ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Interior post-login: saludo + botón de cerrar sesión.
    await expect(
      page.getByRole("heading", { level: 1, name: "Panel de administración" }),
    ).toBeVisible();
    await expect(page.getByText(emailAdmin ?? "")).toBeVisible();

    // Cerrar sesión vuelve a la puerta.
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    // Y la sesión quedó muerta: /admin ya no deja pasar.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
