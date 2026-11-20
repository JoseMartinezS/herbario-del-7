import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  ADMIN_ACTIVITY_COOKIE,
  ADMIN_ACTIVITY_COOKIE_OPTIONS,
  ADMIN_LOGIN_PATH,
  AUTH_COOKIE_OPTIONS,
  getSupabaseAuthConfig,
  parseLastActivityCookie,
  shouldExpireSession,
} from "@/lib/supabase-auth";

/**
 * El portero del panel admin (F2.2) + expiración por inactividad.
 *
 * Protege TODA la familia `/admin/*` menos la puerta `/admin/login`, que
 * es pública (es el formulario, no el interior). El matcher de abajo está
 * acotado a `/admin` a propósito: ninguna ruta pública del sitio pasa por
 * acá, así que este middleware no puede romper la tienda.
 *
 * Patrón oficial de @supabase/ssr para Next:
 *
 * 1. Se crea un cliente server con las cookies DEL REQUEST. Llamar
 *    `auth.getUser()` valida el token contra el servidor de Auth y, si está
 *    por vencer, refresca la sesión. El refresh se escribe como cookies en
 *    el RESPONSE vía `setAll` (y se refleja también en el request, para que
 *    el render posterior ya vea la sesión renovada).
 * 2. Sin usuario válido → redirect 307 a `/admin/login` llevando la URL
 *    original en `?next=` para volver después del login.
 *
 * Fail-closed: si faltan las env vars de Supabase no hay sesión posible,
 * así que también se redirige a la puerta (el login, a su vez, responderá
 * que el acceso no está configurado). El panel jamás queda abierto por
 * accidente.
 *
 * Expiración por inactividad (Polish del panel): con sesión válida, la
 * cookie `sb-admin-last-activity` lleva el timestamp de la última visita
 * autenticada. Si pasaron más de 5 horas (SESSION_INACTIVITY_MS) se cierra
 * la sesión (signOut local: el SDK limpia sus cookies de sesión vía el
 * setAll de acá arriba, chunks incluidos) y se redirige a la puerta con
 * `?expired=1`. Si no expiró, el timestamp se renueva en el response —
 * la ventana es deslizante: 5 horas desde la ÚLTIMA actividad.
 *
 * NOTA de runtime: el middleware corre en Edge. Este archivo NO importa
 * `lib/supabase-auth-server.ts` (que usa `next/headers`, inexistente en
 * edge) — solo el módulo puro `lib/supabase-auth.ts` y @supabase/ssr,
 * diseñado para este runtime.
 */

/** La puerta no exige sesión: es el único pase directo de la familia. */
const RUTAS_PUBLICAS_ADMIN = [ADMIN_LOGIN_PATH, `${ADMIN_LOGIN_PATH}/`];

/**
 * Redirect 307 a la puerta, preservando la URL original en `?next=` (para
 * volver tras el login) y, si la sesión expiró, con `?expired=1` (la puerta
 * muestra el aviso de inactividad).
 */
function redirigirAlLogin(
  request: NextRequest,
  { expirada = false }: { expirada?: boolean } = {},
): NextResponse {
  const url = request.nextUrl.clone();
  // A dónde volver: path + query originales (p. ej. "/admin/productos?x=1").
  const destino = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = ADMIN_LOGIN_PATH;
  url.search = "";
  url.searchParams.set("next", destino);
  if (expirada) {
    url.searchParams.set("expired", "1");
  }
  return NextResponse.redirect(url);
}

export async function middleware(
  request: NextRequest,
): Promise<NextResponse> {
  // 1. La puerta de entrada es pública; el resto de /admin/* exige sesión.
  if (RUTAS_PUBLICAS_ADMIN.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // 2. Sin env vars no hay auth posible: fail-closed.
  const config = getSupabaseAuthConfig();
  if (config === null) {
    return redirigirAlLogin(request);
  }

  // 3. Cliente oficial @supabase/ssr sobre las cookies del request. El SDK
  //    bufferiza los cambios de sesión y los escribe de a UNA tanda por
  //    request a través de setAll (refresh, signout, etc.).
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Primero el request: así el render posterior de la MISMA navegación
        // ya ve la sesión refrescada (y por eso se recrea el response, que
        // captura el request en su creación).
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Headers anti-caché del SDK: evita que un CDN sirva la sesión de
        // una persona a otra (Vercel Edge está detrás de CDN).
        for (const [clave, valor] of Object.entries(headers)) {
          response.headers.set(clave, valor);
        }
      },
    },
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });

  // 4. Verificación autoritativa + refresh temprano: DEBE llamarse antes de
  //    devolver la respuesta, porque un refresh que llega tarde no puede
  //    escribir sus cookies y la sesión se pierde en el request siguiente.
  const { data, error } = await supabase.auth.getUser();

  if (error !== null || data.user === null) {
    const redirect = redirigirAlLogin(request);
    // No perder las cookies que el SDK haya escrito en `response` (p. ej.
    // la limpieza de sesión tras un refresh fallido): viajan pegadas al
    // redirect para que el navegador las aplique igual.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set({ ...cookie });
    }
    return redirect;
  }

  // 5. Sesión válida. Antes de pasar: ¿expiró por inactividad? La decisión
  //    es la función pura de lib/supabase-auth.ts (testeable); la cookie
  //    ausente es gracia — se crea más abajo con now, nunca expira a un
  //    usuario activo existente (primer despliegue, cookie corrupta).
  const lastActivity = parseLastActivityCookie(
    request.cookies.get(ADMIN_ACTIVITY_COOKIE)?.value,
  );
  if (shouldExpireSession(lastActivity, Date.now())) {
    // SignOut local: el SDK remueve la sesión (evento SIGNED_OUT) y escribe
    // las cookies de sesión BORRADAS (maxAge 0, chunks incluidos) vía el
    // setAll de arriba, que ya está cableado a `response`. Con scope local
    // la remoción es primero y no depende de la red; el revoke del refresh
    // token que sigue es best-effort y no puede dejar la sesión viva en el
    // navegador: sin cookies, el refresh token no sirve.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error: unknown) {
      console.warn(
        `[auth] no se pudo revocar la sesión expirada en el servidor (${
          error instanceof Error ? error.message : "sin detalle"
        }); las cookies se limpian igual.`,
      );
    }
    const redirect = redirigirAlLogin(request, { expirada: true });
    // Las cookies de sesión limpiadas por el SDK viajan pegadas al redirect
    // (mismo criterio que la rama sin sesión).
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set({ ...cookie });
    }
    // Y la cookie de actividad también se borra: el próximo login arranca
    // de cero (loginAction la renueva al entrar).
    redirect.cookies.set({
      name: ADMIN_ACTIVITY_COOKIE,
      value: "",
      ...ADMIN_ACTIVITY_COOKIE_OPTIONS,
      maxAge: 0,
    });
    return redirect;
  }

  // 6. Actividad fresca: renovar el timestamp (ventana deslizante de 8 h
  //    desde la última visita) en la MISMA respuesta que pasa.
  response.cookies.set(
    ADMIN_ACTIVITY_COOKIE,
    String(Date.now()),
    ADMIN_ACTIVITY_COOKIE_OPTIONS,
  );

  // 7. Hay sesión válida (y recién refrescada si hacía falta): pasar.
  return response;
}

/**
 * SOLO la familia /admin. El patrón `:path*` cubre tanto `/admin` a secas
 * como cualquier subruta (`/admin/productos`, `/admin/lo-que-venga`).
 * Ninguna ruta pública (/, /catalogo, /ubicacion, /contacto, /nosotros,
 * legales) matchea: el middleware ni se ejecuta para la tienda.
 */
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
