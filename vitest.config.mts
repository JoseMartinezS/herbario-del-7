import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

/**
 * Config de Vitest. Va en .mts (ESM) porque el package.json no declara
 * "type": "module": así el loader nativo de Vite la carga sin warnings.
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias "@/*" del tsconfig, apuntando a la raíz del repo.
      "@": rootDir,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    // tests/e2e/** es territorio del agente B (Playwright): vitest NO debe
    // intentar correr esos specs.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
