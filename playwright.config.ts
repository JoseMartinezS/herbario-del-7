import { defineConfig, devices } from "@playwright/test";

/**
 * Config de Playwright para E2E contra el DEV server.
 *
 * - Playwright levanta el server SOLO (webServer) y lo apaga al terminar;
 *   si ya hay uno corriendo en el puerto, lo reutiliza.
 * - tests/e2e/** está excluido de Vitest (vitest.config.mts), así que
 *   `npm test` (unit) y `npm run test:e2e` no se pisan.
 * - Para el E2E contra el build de producción, ver playwright.prod.config.ts.
 *
 * PUERTO 3100 (no 3000): en la máquina de desarrollo el relay de WSL
 * (wslrelay.exe) ocupa el loopback :3000 en IPv4 e IPv6 con un servicio
 * ajeno a este sitio (responde 404), lo que envenena el health check y
 * hace que `next dev` se corra a otro puerto. 3100 evita el conflicto de
 * forma determinista en dev local y en CI (donde :3000 suele estar libre,
 * 3100 funciona igual). Cambiar de puerto aquí no afecta al sitio.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // Sin reintentos en local: un flake se investiga, no se tapa.
  retries: 0,
  // 60 s porque en dev frío Turbopack compila cada ruta bajo demanda.
  timeout: 60_000,
  // UN worker: el dev server compila bajo demanda y con requests paralelos
  // a la misma ruta fría puede romper transientemente (JSON.parse del
  // cache de Turbopack) y servir el overlay de error. Serializado es
  // determinista. El config de prod (build precompilado) sí paraleliza.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  // Fuera de .next (default de Playwright); cubierto por .gitignore.
  outputDir: "test-results",
});
