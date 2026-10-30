import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra el BUILD DE PRODUCCIÓN.
 *
 * Requiere `npm run build` previo: lo corre el USUARIO o CI con
 * `npm run test:e2e:prod` (ese script hace build + test él mismo).
 * No ejecutar este config sin build: `next start` fallaría.
 *
 * Idéntico a playwright.config.ts salvo webServer.command (npm run start).
 * El puerto 3100 y su justificación están documentados allí.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: 0,
  timeout: 60_000,
  // A diferencia del config de dev, aquí SÍ conviene paralelizar: el
  // build ya está compilado y no hay carreras de compilación en frío.
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
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  outputDir: "test-results",
});
