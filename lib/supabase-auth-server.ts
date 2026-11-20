import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ADMIN_ACTIVITY_COOKIE,
  ADMIN_ACTIVITY_COOKIE_OPTIONS,
  AUTH_COOKIE_OPTIONS,
  getSupabaseAuthConfig,
} from "./supabase-auth";

/**
 * Cliente de Supabase para el LADO SERVIDOR de App Router (F2.2).
 *
 * A diferencia de `lib/supabase-auth.ts` (puro, compartido con el
 * middleware), este módulo sí usa `next/headers` y solo puede usarse desde
 * Server Actions y Server Components — nunca desde `middleware.ts` (edge
 * runtime, donde `next/headers` no existe) ni desde componentes cliente.
 *
 * Patrón oficial de @supabase/ssr para Next App Router: el cliente se crea
 * NUEVO en cada request (el storage de cookies es por-request) y la sesión
 * se lee y escribe a través de la cookie store de Next.
 *
 * ¿Por qué el SDK y no fetch directo (como hizo F2.1 con el catálogo)?
 * Porque la sesión vive ENTRE requests: hay que refrescar tokens que
 * vencen, trocear cookies grandes, firmar el logout y mantener los chunks
 * consistentes. @supabase/ssr existe exactamente para eso; el fetch
 * directo de F2.1 era correcto para UNA lectura pública sin estado.
 */

/**
 * Factory del cliente server con manejo de cookies.
 *
 * Lanza Error si faltan las env vars: quien llama (Server Action, página)
 * debe decidir primero qué hacer sin config — normalmente chequear
 * `getSupabaseAuthConfig()` y responder con un mensaje claro.
 */
export async function createSupabaseAuthClient(): Promise<SupabaseClient> {
  const config = getSupabaseAuthConfig();
  if (config === null) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY para crear el cliente de auth.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components renderizando no pueden escribir cookies (Next
          // lo lanza en fase de render): el refresh de la sesión lo hace el
          // middleware en el request siguiente. En Server Actions sí se
          // puede escribir, y este catch no se dispara.
        }
      },
    },
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}

/**
 * El usuario autenticado que hace ESTE request (o null si no hay sesión).
 *
 * Usa `auth.getUser()`, que valida el access token contra el servidor de
 * Auth en vez de confiarse del contenido de la cookie: es la verificación
 * autoritativa (detecta tokens revocados) y es la que la guía de Supabase
 * recomienda para proteger páginas. El costo es una llamada de red por
 * render del panel — aceptable para una página interna de administración.
 *
 * Falla cerrado: sin config, con error de red o con token inválido,
 * devuelve null. Quien llama decide (la página admin redirige a la puerta;
 * el middleware ya frenó el 99% de esos casos antes).
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const config = getSupabaseAuthConfig();
  if (config === null) {
    return null;
  }
  try {
    const supabase = await createSupabaseAuthClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/* ============================================================================
 * Cookie de actividad del panel (expiración por inactividad)
 * ==========================================================================*/

/**
 * Renueva la cookie de actividad con `now` (la usa loginAction al entrar:
 * la sesión recién abierta arranca con ventana fresca, aunque el navegador
 * trajera una cookie vieja de una sesión anterior).
 *
 * Best-effort con warn: si la escritura fallara, no hay que tumbar el
 * login — el middleware la re-crea en el próximo request a /admin.
 */
export async function resetAdminActivityCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(
      ADMIN_ACTIVITY_COOKIE,
      String(Date.now()),
      ADMIN_ACTIVITY_COOKIE_OPTIONS,
    );
  } catch (error: unknown) {
    console.warn(
      `[auth] no se pudo renovar la cookie de actividad (${
        error instanceof Error ? error.message : "sin detalle"
      }); el middleware la re-crea en el próximo request.`,
    );
  }
}

/**
 * Borra la cookie de actividad (la usa logoutAction: al cerrar sesión no
 * queda rastro de la última visita — y un próximo login no hereda un
 * timestamp viejo que expiraría la sesión nueva al instante).
 */
export async function clearAdminActivityCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name: ADMIN_ACTIVITY_COOKIE,
      value: "",
      ...ADMIN_ACTIVITY_COOKIE_OPTIONS,
      maxAge: 0,
    });
  } catch (error: unknown) {
    console.warn(
      `[auth] no se pudo borrar la cookie de actividad (${
        error instanceof Error ? error.message : "sin detalle"
      }); sin sesión no expira nada, el próximo login la renueva.`,
    );
  }
}
