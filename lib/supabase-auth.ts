import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Autenticación del panel admin (F2.2) — parte PURA y compartida.
 *
 * Este módulo NO importa nada de Next (`next/headers`, `next/server`) ni
 * crea clientes: es el contrato que comparten los tres contextos de auth,
 * con distinto runtime cada uno:
 *
 * - `middleware.ts` (edge runtime): lee la config y las opciones de cookie,
 *   pero NO puede importar `next/headers` (no existe en middleware). Por eso
 *   este archivo debe mantenerse libre de imports de framework.
 * - `app/admin/actions.ts` y las páginas admin (runtime de Node, Server
 *   Actions/RSC): usan este contrato vía `lib/supabase-auth-server.ts`,
 *   que sí puede usar `next/headers`.
 * - `lib/supabase-auth.test.ts` (Vitest): testeable sin red porque todo
 *   acá es función pura sobre strings y env vars.
 *
 * Env vars: LAS MISMAS de F2.1 (`lib/supabase-catalog.ts`) — el catálogo y
 * la autenticación son el mismo proyecto de Supabase, no hay nombres nuevos.
 */

/** Ruta de la puerta de entrada: la única de /admin que no exige sesión. */
export const ADMIN_LOGIN_PATH = "/admin/login";

/** Destino por defecto tras un login exitoso (o ante un `next` inválido). */
export const ADMIN_DEFAULT_PATH = "/admin";

/** Config para hablar con Supabase Auth; null si faltan env vars. */
export interface SupabaseAuthConfig {
  /** URL del proyecto, sin slash final (p. ej. https://xxxx.supabase.co). */
  url: string;
  /** Publishable/anon key: la misma pública que usa el catálogo. */
  anonKey: string;
}

/**
 * Lee las env vars de Supabase (mismos nombres que F2.1). Devuelve null si
 * falta alguna o la URL no parsea: sin config no hay autenticación posible
 * y todo el panel queda cerrado (fail-closed, nunca fail-open).
 *
 * Se lee en cada llamada (no al importar) para que los tests puedan simular
 * ambos modos, igual que getSupabaseCatalogConfig.
 */
export function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`protocolo ${parsed.protocol} no soportado`);
    }
    return { url: url.replace(/\/+$/, ""), anonKey };
  } catch {
    console.warn(
      `[auth] NEXT_PUBLIC_SUPABASE_URL tiene un valor inválido ("${url}"); se ignora y el panel queda cerrado.`,
    );
    return null;
  }
}

/**
 * Opciones de las cookies de sesión.
 *
 * El default de @supabase/ssr es `httpOnly: false` (pensado para que un
 * cliente browser lea la sesión con JavaScript). Aquí la sesión vive SOLO
 * en el servidor — el login y el logout son Server Actions y la lectura la
 * hacen el middleware y los server components — así que la cookie se marca
 * httpOnly para que ningún script del navegador (propio o de un tercero)
 * pueda leer el token.
 *
 * `secure` solo en producción: en dev el sitio corre en http://localhost, y
 * un Secure cookie sobre http plano es rechazado por el navegador (con las
 * peculiaridades de proxy de localhost, mejor no arriesgar el debug). En
 * producción (Vercel, https) la cookie exige cifrado en el transporte.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/* ============================================================================
 * Expiración de sesión por inactividad (Polish del panel)
 * ==========================================================================*/

/** Cookie propia con el timestamp Unix (ms) de la última petición autenticada a /admin/*. */
export const ADMIN_ACTIVITY_COOKIE = "sb-admin-last-activity";

/**
 * Ventana de inactividad de la sesión del panel: 5 horas.
 *
 * Media jornada de mostrador (decisión del dueño): la sesión acompaña
 * mientras el panel se usa, y si el teléfono queda botado —o perdido—
 * y nadie toca /admin durante 5 horas, la siguiente visita pide login
 * de nuevo. Las cookies de Supabase + el refresh del middleware hacen
 * la sesión casi eterna por diseño; esta ventana le pone horario de
 * tienda: al día siguiente, siempre login.
 */
export const SESSION_INACTIVITY_MS = 5 * 60 * 60 * 1000;

/**
 * Opciones de la cookie de actividad (el mismo manejo que las de
 * sesión): httpOnly para que ningún script la lea, lax, secure en
 * producción, y 30 días de vida — más que cualquier sesión real de
 * navegador, para que la ventana de 5 horas se cumpla aunque el celular
 * no se reinicie en días. Si de verdad pasan 30 días sin tocar /admin,
 * la cookie cae y el primer request entra por gracia (el refresh token
 * de Supabase ya habrá caducado mucho antes).
 */
export const ADMIN_ACTIVITY_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
} as const;

/** Solo dígitos, y con tope de 15 (cubre épocas hasta el año ~2286). */
const PATRON_TIMESTAMP = /^\d{1,15}$/;

/**
 * Parsea el valor crudo de la cookie de actividad → número, o null si
 * está ausente o es basura (una cookie corrupta se trata como ausente:
 * gracia, nunca expiración instantánea).
 */
export function parseLastActivityCookie(
  raw: string | undefined,
): number | null {
  if (raw === undefined || !PATRON_TIMESTAMP.test(raw)) {
    return null;
  }
  return Number(raw);
}

/**
 * ¿La sesión del panel expiró por inactividad?
 *
 * - `lastActivity` en null (cookie ausente: primer despliegue, usuario
 *   previo, o cookie corrupta) → NO expira: se crea con `now` en el
 *   response (gracia — no se le cierra la sesión a nadie activo).
 * - Ahora exacto menos 5 horas → al límite NO expira (ventana renovada).
 * - Un timestamp a futuro (reloj desviado) tampoco: se renueva.
 */
export function shouldExpireSession(
  lastActivity: number | null,
  now: number,
): boolean {
  if (lastActivity === null) {
    return false;
  }
  return now - lastActivity > SESSION_INACTIVITY_MS;
}

/**
 * Charset conservador para un path interno: letras, dígitos y los
 * caracteres legales de un URL (path + query). Rechaza backslashes,
 * espacios, controles y cualquier cosa exótica ANTES de que llegue a un
 * redirect. Los paths reales del sitio (kebab-case + query simple) pasan
 * de sobra.
 */
const PATRON_RUTA_INTERNA = /^[-A-Za-z0-9/_.~!$&'()*+,;=:@?#%]+$/;

/** Límite defensivo: un `next` más largo que esto es basura, no una ruta. */
const LARGO_MAXIMO_NEXT = 2048;

/**
 * Sanea el parámetro `next` (a dónde volver después del login).
 *
 * El valor llega por URL (`/admin/login?next=…`) y se usa como destino de
 * un redirect: es abierto por diseño, así que SOLO se aceptan paths
 * internos. Cualquier cosa que pueda navegar a otro origen se ignora y se
 * cae al destino por defecto (`/admin`):
 *
 * - sin `/` inicial (relativos y URLs con esquema: `https:`, `javascript:`),
 * - `//…` o `/\\…` (protocolo-relativos: el navegador los resuelve a otro
 *   dominio),
 * - `://` embebido, caracteres fuera del patrón o largo absurdo.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback: string = ADMIN_DEFAULT_PATH,
): string {
  if (typeof raw !== "string" || raw.length === 0) {
    return fallback;
  }
  if (!raw.startsWith("/")) {
    return fallback;
  }
  if (raw.startsWith("//") || raw.startsWith("/\\")) {
    return fallback;
  }
  if (raw.includes("://") || raw.length > LARGO_MAXIMO_NEXT) {
    return fallback;
  }
  if (!PATRON_RUTA_INTERNA.test(raw)) {
    return fallback;
  }
  return raw;
}

/** Forma mínima de un AuthError de supabase-js, para traducir sin acoplar. */
export interface AuthErrorLike {
  /** Código estable del error (p. ej. "invalid_credentials"), si viene. */
  code?: string;
  /** Mensaje crudo en inglés que devuelve el servidor de Auth. */
  message: string;
}

/**
 * Traduce un error de Supabase Auth a un mensaje claro para la persona que
 * administra el herbolario: sin códigos, sin jerga, y con el siguiente paso
 * cuando existe uno.
 *
 * Se fija primero en `code` (estable) y después en `message` (legacy), para
 * no depender de una versión puntual de supabase-js.
 */
export function translateAuthError(error: AuthErrorLike): string {
  const codigo = error.code?.toLowerCase() ?? "";
  const mensaje = error.message.toLowerCase();

  if (
    codigo.includes("invalid_credentials") ||
    codigo.includes("bad_credentials") ||
    mensaje.includes("invalid login credentials")
  ) {
    return "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.";
  }
  if (
    codigo.includes("email_not_confirmed") ||
    mensaje.includes("email not confirmed")
  ) {
    return "Tu cuenta todavía no está confirmada. Se confirma desde el dashboard de Supabase (Authentication → Users); los pasos están en el README del proyecto.";
  }
  if (
    codigo.includes("rate_limit") ||
    mensaje.includes("too many requests") ||
    mensaje.includes("for security purposes")
  ) {
    return "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.";
  }
  return "No pudimos iniciar tu sesión. Inténtalo de nuevo en unos minutos.";
}
