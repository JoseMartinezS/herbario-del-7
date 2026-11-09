import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_DEFAULT_PATH,
  SESSION_INACTIVITY_MS,
  getSupabaseAuthConfig,
  parseLastActivityCookie,
  sanitizeNextPath,
  shouldExpireSession,
  translateAuthError,
} from "./supabase-auth";

/**
 * Tests de la parte PURA de la autenticación admin (F2.2 + expiración por
 * inactividad): config de env vars, saneo del parámetro `next`, traducción
 * de errores de Supabase y la decisión de expiración de sesión.
 *
 * Lo que NO está acá, a propósito:
 *
 * - `middleware.ts`: corre en edge runtime, habla con el servidor de Auth
 *   (getUser) y está acoplado a NextRequest/NextResponse. No hay forma
 *   limpia de testearlo unitario sin mockear media internet; su contrato
 *   real (redirect a /admin/login con ?next=, y ?expired=1 al expirar)
 *   lo cubre tests/e2e/admin.spec.ts contra el server de verdad.
 * - `lib/supabase-auth-server.ts`: la factory depende de `next/headers`
 *   (cookies del request) y de la red. Ídem: cubierto por E2E.
 *
 * Los env stubs se hacen EXPLÍCITOS (incluso para "sin config", se pega
 * string vacía) para que la suite sea determinística en cualquier máquina,
 * tenga o no las variables exportadas en el shell.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Deja el entorno "sin Supabase" de forma determinística. */
function sinSupabase(): void {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
}

describe("getSupabaseAuthConfig", () => {
  it("sin env vars devuelve null (fail-closed: no hay auth)", () => {
    sinSupabase();
    expect(getSupabaseAuthConfig()).toBeNull();
  });

  it("con las dos env vars devuelve la config, sin slash final en la url", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
    expect(getSupabaseAuthConfig()).toEqual({
      url: "https://ejemplo.supabase.co",
      anonKey: "anon-de-prueba",
    });
  });

  it("con una sola env var no activa (necesita las dos)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
    expect(getSupabaseAuthConfig()).toBeNull();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ejemplo.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(getSupabaseAuthConfig()).toBeNull();
  });

  it("con una URL inválida devuelve null (y no tira)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "eso-no-es-una-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-prueba");
    expect(getSupabaseAuthConfig()).toBeNull();
  });
});

describe("sanitizeNextPath", () => {
  it("deja pasar paths internos, con query incluida", () => {
    expect(sanitizeNextPath("/admin")).toBe("/admin");
    expect(sanitizeNextPath("/admin/productos?editar=veladoras")).toBe(
      "/admin/productos?editar=veladoras",
    );
    expect(sanitizeNextPath("/catalogo/veladoras-preparadas")).toBe(
      "/catalogo/veladoras-preparadas",
    );
  });

  it("sin valor, null o vacío cae al destino por defecto", () => {
    expect(sanitizeNextPath(undefined)).toBe(ADMIN_DEFAULT_PATH);
    expect(sanitizeNextPath(null)).toBe(ADMIN_DEFAULT_PATH);
    expect(sanitizeNextPath("")).toBe(ADMIN_DEFAULT_PATH);
  });

  it("rechaza URLs externas y esquemas (nada que no empiece con /)", () => {
    for (const valor of [
      "https://malicioso.example/admin",
      "http://malicioso.example",
      "javascript:alert(1)",
      "mailto:correo@ejemplo.com",
      "admin/productos",
    ]) {
      expect(sanitizeNextPath(valor), valor).toBe(ADMIN_DEFAULT_PATH);
    }
  });

  it("rechaza protocolo-relativos: // y /\\ apuntan a OTRO dominio", () => {
    expect(sanitizeNextPath("//malicioso.example")).toBe(ADMIN_DEFAULT_PATH);
    expect(sanitizeNextPath("/\\malicioso.example")).toBe(ADMIN_DEFAULT_PATH);
    expect(sanitizeNextPath("//herbariodel7.com")).toBe(ADMIN_DEFAULT_PATH);
  });

  it("rechaza caracteres de control, espacios y backslashes", () => {
    // Los caracteres de control se construyen por código (no por literal)
    // para que nada dependa de cómo escapa cada editor/archivo.
    const saltoLinea = String.fromCharCode(10);
    const tabulador = String.fromCharCode(9);
    for (const valor of [
      `/admin${saltoLinea}`,
      "/admin/x y",
      "/admin\\x",
      `/admin/${tabulador}eno`,
    ]) {
      expect(sanitizeNextPath(valor), JSON.stringify(valor)).toBe(
        ADMIN_DEFAULT_PATH,
      );
    }
  });

  it("rechaza valores absurdamente largos", () => {
    expect(sanitizeNextPath(`/${"a".repeat(3000)}`)).toBe(ADMIN_DEFAULT_PATH);
  });

  it("respeta el fallback que le pase quien llama", () => {
    expect(
      sanitizeNextPath("https://malicioso.example", "/admin/productos"),
    ).toBe("/admin/productos");
  });
});

describe("translateAuthError", () => {
  it("credenciales inválidas: mensaje claro, por código y por mensaje legacy", () => {
    expect(
      translateAuthError({ code: "invalid_credentials", message: "x" }),
    ).toContain("no coinciden");
    expect(
      translateAuthError({ message: "Invalid login credentials" }),
    ).toContain("no coinciden");
  });

  it("email sin confirmar: apunta al fix en el dashboard de Supabase", () => {
    expect(
      translateAuthError({ code: "email_not_confirmed", message: "x" }),
    ).toContain("confirmada");
    expect(translateAuthError({ message: "Email not confirmed" })).toContain(
      "Supabase",
    );
  });

  it("rate limit: pide esperar unos minutos", () => {
    expect(
      translateAuthError({ code: "over_request_rate_limit", message: "x" }),
    ).toContain("unos minutos");
  });

  it("error desconocido: mensaje genérico con siguiente paso", () => {
    expect(translateAuthError({ message: "Unexpected duck" })).toContain(
      "Inténtalo de nuevo",
    );
  });
});

describe("shouldExpireSession (expiración por inactividad)", () => {
  // Un "ahora" fijo: la función es pura, el reloj lo pone quien llama.
  const ahora = 1_760_000_000_000;

  it("la ventana es de 5 horas exactas (media jornada de mostrador)", () => {
    expect(SESSION_INACTIVITY_MS).toBe(5 * 60 * 60 * 1000);
  });

  it("expira recién pasadas las 5 horas (5 h + 1 ms)", () => {
    expect(shouldExpireSession(ahora - SESSION_INACTIVITY_MS - 1, ahora)).toBe(
      true,
    );
  });

  it("no expira un ms antes de las 5 horas (5 h − 1 ms)", () => {
    expect(shouldExpireSession(ahora - SESSION_INACTIVITY_MS + 1, ahora)).toBe(
      false,
    );
  });

  it("en el límite exacto de las 5 horas no expira (la ventana se renueva)", () => {
    expect(shouldExpireSession(ahora - SESSION_INACTIVITY_MS, ahora)).toBe(
      false,
    );
  });

  it("null (cookie ausente: primer despliegue, usuario previo) es gracia: no expira", () => {
    expect(shouldExpireSession(null, ahora)).toBe(false);
  });

  it("actividad de ahora mismo: no expira", () => {
    expect(shouldExpireSession(ahora, ahora)).toBe(false);
  });

  it("timestamp a futuro (reloj desviado): no expira, se renueva", () => {
    expect(shouldExpireSession(ahora + 5 * 60_000, ahora)).toBe(false);
  });

  it("una jornada completa sin tocar el panel (24 h) expira", () => {
    expect(shouldExpireSession(ahora - 24 * 60 * 60 * 1000, ahora)).toBe(true);
  });
});

describe("parseLastActivityCookie", () => {
  it("un timestamp en ms parsea a número", () => {
    expect(parseLastActivityCookie("1760000000000")).toBe(1_760_000_000_000);
    expect(parseLastActivityCookie("0")).toBe(0);
  });

  it("ausente o vacío → null (gracia)", () => {
    expect(parseLastActivityCookie(undefined)).toBeNull();
    expect(parseLastActivityCookie("")).toBeNull();
  });

  it("basura → null (cookie corrupta se trata como ausente)", () => {
    for (const valor of [
      "abc",
      "-123",
      "1.5",
      "1e12",
      " 123",
      "123 ",
      "NaN",
      "Infinity",
    ]) {
      expect(parseLastActivityCookie(valor), JSON.stringify(valor)).toBeNull();
    }
  });

  it("más de 15 dígitos → null (épocas absurdas son basura)", () => {
    expect(parseLastActivityCookie("1".repeat(15))).toBe(111_111_111_111_111);
    expect(parseLastActivityCookie("1".repeat(16))).toBeNull();
  });
});
