"use server";

import { redirect } from "next/navigation";
import {
  ADMIN_LOGIN_PATH,
  getSupabaseAuthConfig,
  sanitizeNextPath,
  translateAuthError,
} from "@/lib/supabase-auth";
import { createSupabaseAuthClient } from "@/lib/supabase-auth-server";

/**
 * Server Actions del panel admin (F2.2).
 *
 * El login y el logout corren ÍNTEGRAMENTE en el servidor: la contraseña
 * nunca llega al bundle del cliente ni se expone en el HTML, y la cookie de
 * sesión (httpOnly, ver AUTH_COOKIE_OPTIONS) la escribe el SDK desde acá.
 * No hay cliente browser de Supabase en este proyecto a propósito.
 */

/** Entrada del login, tal como la manda el formulario. */
export interface LoginInput {
  email: string;
  password: string;
  /** Destino post-login (`?next=` saneado); se re-sanea acá, nunca confiar. */
  nextPath: string;
}

/** Única forma de retorno del login: el error para mostrar en pantalla. */
export interface LoginActionError {
  error: string;
}

/** Sin env vars de Supabase el acceso no puede funcionar: mensaje claro. */
const MENSAJE_NO_CONFIGURADO =
  "El acceso al panel no está configurado en este entorno. Revisa las variables de entorno de Supabase del proyecto.";

/** Mensaje para fallas de red hacia el servidor de Auth. */
const MENSAJE_RED =
  "No pudimos conectar con el servicio de acceso. Revisa tu conexión e inténtalo de nuevo.";

/**
 * Inicia sesión con email + contraseña contra Supabase Auth.
 *
 * En éxito REDIRIGE (redirect de next/navigation, que en una Server Action
 * navega al cliente al destino): al `nextPath` saneado o a `/admin`. El
 * redirect está FUERA del try/catch a propósito — redirect() lanza una
 * señal interna de Next que no debe tragarse un catch.
 */
export async function loginAction(
  input: LoginInput,
): Promise<LoginActionError | undefined> {
  const config = getSupabaseAuthConfig();
  if (config === null) {
    return { error: MENSAJE_NO_CONFIGURADO };
  }

  let fallo: LoginActionError | null = null;
  try {
    const supabase = await createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error !== null || data.user === null) {
      fallo = {
        error: translateAuthError(
          error ?? { message: "sin detalle del error" },
        ),
      };
    }
  } catch {
    // supabase-js devuelve casi todo como { error }, pero una caída de red
    // se lanza como excepción (AuthRetryableFetchError): mismo tratamiento.
    fallo = { error: MENSAJE_RED };
  }

  if (fallo !== null) {
    return fallo;
  }

  // Éxito: la cookie httpOnly ya la escribió el SDK. Redirigir (fuera del
  // try/catch) al destino saneado — re-saneado acá porque el cliente pudo
  // mandar cualquier cosa.
  redirect(sanitizeNextPath(input.nextPath));
}

/**
 * Cierra la sesión: el SDK limpia las cookies (signOut) y se redirige a la
 * puerta. Sin confirmación en la UI — volver a entrar es barato y reversible.
 */
export async function logoutAction(): Promise<void> {
  const config = getSupabaseAuthConfig();
  if (config !== null) {
    // Si la sesión ya no es válida (token vencido, cuenta deshabilitada),
    // igual conviene cerrar: signOut limpia las cookies locales.
    const supabase = await createSupabaseAuthClient();
    await supabase.auth.signOut();
  }
  redirect(ADMIN_LOGIN_PATH);
}
