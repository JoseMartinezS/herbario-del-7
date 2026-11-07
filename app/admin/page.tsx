import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SprigDivider from "@/components/SprigDivider";
import { ADMIN_LOGIN_PATH } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";
import { logoutAction } from "./actions";

/**
 * Interior del panel admin (F2.2): la bienvenida post-login.
 *
 * Server component que lee al usuario autenticado desde las cookies de
 * sesión (verificación autoritativa contra el servidor de Auth). En
 * condiciones normales el middleware ya frenó a cualquier intruso ANTES de
 * llegar acá; el chequeo de abajo es defensivo — si por alguna razón no hay
 * sesión (cookies limpiadas a mitad de vuelo, token revocado), se trata
 * como no autorizado y a la puerta.
 *
 * El botón "Cerrar sesión" es un form con la Server Action `logoutAction`:
 * funciona sin JavaScript, el SDK limpia las cookies httpOnly en el server
 * y nadie más viaja en el request. Sin confirmación: reentrar es barato.
 *
 * La gestión de productos (CRUD del catálogo) llega en F2.3.
 */

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (user === null) {
    redirect(ADMIN_LOGIN_PATH);
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      {/* Doble filete dorado: la firma visual de la familia /admin. */}
      <div className="rounded-2xl border-2 border-gold-600/60 p-1.5">
        <div className="rounded-xl p-6 ring-1 ring-inset ring-gold-600/40 sm:p-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-green-800 sm:text-4xl">
            Panel de administración
          </h1>
          <p className="mt-4 max-w-prose text-pretty text-base leading-relaxed text-green-800/85">
            Hola,{" "}
            <span className="font-semibold break-all" translate="no">
              {user.email ?? "tu cuenta"}
            </span>
            . Tu sesión quedó activa.
          </p>
          <SprigDivider className="mt-6" />
          <p className="mt-6 max-w-prose text-pretty text-base leading-relaxed text-green-800/85">
            El panel de productos llega en la siguiente fase (F2.3).
          </p>
          <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-green-800/65">
            Desde aquí vas a poder crear, editar y retirar las fichas del
            catálogo del herbolario, con foto, precio y categoría.
          </p>
          <form action={logoutAction} className="mt-8">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-green-300 bg-transparent px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
