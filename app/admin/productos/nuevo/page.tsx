import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import AdminProductForm from "@/components/AdminProductForm";
import { ADMIN_LOGIN_PATH } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";

/**
 * Crear un producto (F2.3).
 *
 * Ruta estática que Next resuelve ANTES que /admin/productos/[id]
 * (los segmentos fijos ganan sobre los dinámicos), así "nuevo" jamás
 * se interpreta como un id.
 *
 * El slug se arma en vivo desde el nombre (preview en el formulario) y
 * la posición la calcula la action (MAX+1): el dueño solo tipea lo que
 * ve en el mostrador. La foto es obligatoria acá — el flujo natural es
 * sacar la foto, ver el preview y guardar.
 */

export const metadata: Metadata = {
  title: "Nuevo producto",
  robots: { index: false, follow: false },
};

export default async function NuevoProductoPage() {
  // Defensivo (F2.2): el middleware ya exige sesión para /admin/*.
  const user = await getAuthenticatedUser();
  if (user === null) {
    redirect(ADMIN_LOGIN_PATH);
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-semibold text-green-800/80 underline-offset-4 transition-colors hover:text-green-800 hover:underline"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver al panel
      </Link>

      <div className="mt-5 rounded-2xl border-2 border-gold-600/60 p-1.5">
        <div className="rounded-xl p-5 ring-1 ring-inset ring-gold-600/40 sm:p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-green-800 sm:text-3xl">
            Nuevo producto
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-green-800/75">
            La ficha nace publicada en el catálogo. La dirección (URL) se arma
            sola a partir del nombre.
          </p>
          <div className="mt-6">
            <AdminProductForm mode="create" />
          </div>
        </div>
      </div>
    </section>
  );
}
