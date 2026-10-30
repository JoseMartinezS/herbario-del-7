import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Escaneos de accesibilidad con axe-core (WCAG 2.0 nivel A + AA).
 *
 * Muestra representativa: home, catálogo con filtro, ficha de producto
 * sin precio (bloque "consulta el precio") y con precio (bloque $ MXN),
 * ubicación (mapa embebido), contacto (formulario) y una página legal
 * (índice con anclas). Si axe reporta una violación critical/serious,
 * es un BUG REAL de accesibilidad del sitio: se corrige el componente,
 * no se silencia la regla. Cualquier disableSpecificRules DEBE venir
 * con justificación documentada.
 */
const PAGINAS: readonly string[] = [
  "/",
  "/catalogo",
  "/catalogo/veladora-blanca-7-dias",
  "/catalogo/veladora-roja-7-dias",
  "/ubicacion",
  "/contacto",
  "/privacidad",
];

test.describe("Accesibilidad (axe, WCAG 2.0 A/AA)", () => {
  for (const ruta of PAGINAS) {
    test(`"${ruta}" no tiene violaciones critical ni serious`, async ({
      page,
    }) => {
      await page.goto(ruta);

      const resultados = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const graves = resultados.violations.filter(
        (violacion) =>
          violacion.impact === "critical" || violacion.impact === "serious",
      );

      // Detalle legible en el mensaje de falla: regla, impacto y targets.
      const resumen = graves.map(
        (violacion) =>
          `${violacion.id} (${violacion.impact}) en: ${violacion.nodes
            .map((nodo) => nodo.target.join(" > "))
            .join(", ")}`,
      );
      expect(resumen, `violaciones graves en ${ruta}`).toEqual([]);
    });
  }
});
