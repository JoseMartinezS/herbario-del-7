import { expect, test } from "@playwright/test";

/**
 * Contrato de las cabeceras de seguridad HTTP (Track B + fix de F2.3).
 *
 * La CSP es la muralla del sitio: este spec la fija como contrato para
 * que ningún cambio futuro la debilite — o rompa una funcionalidad — sin
 * que CI se entere primero.
 *
 * Caso real que lo motiva: el panel admin sube fotos de producto, y la
 * foto elegida se decodifica y previsualiza en el navegador vía URLs
 * blob: (objectURL). Sin `blob:` en img-src, la propia CSP bloqueaba la
 * carga y el dueño no podía subir NINGUNA foto (falso positivo de
 * seguridad, encontrado en el smoke del 7-nov-2026; las fotos eran
 * perfectamente válidas — el problema era la muralla, no el archivo).
 */
test.describe("Cabeceras de seguridad", () => {
  test("el home sirve la CSP completa, con blob: en img-src", async ({
    request,
  }) => {
    const respuesta = await request.get("/");
    expect(respuesta.status()).toBe(200);

    const csp = respuesta.headers()["content-security-policy"];
    expect(csp, "la respuesta debe traer Content-Security-Policy").toBeDefined();

    // Contrato del fix: sin blob: el panel no puede preparar fotos.
    expect(csp).toContain("img-src 'self' data: blob:");

    // El iframe del mapa de /ubicacion (dominio exacto, no wildcard).
    expect(csp).toContain("frame-src https://www.google.com");

    // Directivas que se cierran por completo.
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  test("el home sirve el resto de cabeceras endurecidas", async ({
    request,
  }) => {
    const respuesta = await request.get("/");
    const headers = respuesta.headers();

    expect(headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });
});
