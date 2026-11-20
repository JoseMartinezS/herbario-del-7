import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import AdminProductForm from "@/components/AdminProductForm";
import { ADMIN_LOGIN_PATH } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";
import { getAdminProductById } from "@/lib/admin-products";
import type { AdminProduct } from "@/lib/admin-products";

/**
 * Editar un producto (F2.3): carga la fila por id y renderiza el mismo
 * formulario compartido en modo edición.
 *
 * El id llega por URL desde la lista. Si no es un UUID o la fila no
 * existe (p. ej. un link viejo de una ficha borrada en el dashboard),
 * se muestra un aviso DENTRO del panel con vuelta a la lista — no la
 * 404 pública del sitio: acá el contexto es el dueño, no un visitante.
 *
 * Sin sesión → a la puerta (defensivo, como toda la familia /admin).
 */

export const metadata: Metadata = {
  title: "Editar producto",
  robots: { index: false, follow: false },
};

interface EditarProductoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({
  params,
}: EditarProductoPageProps) {
  // Defensivo (F2.2): el middleware ya exige sesión para /admin/*.
  const user = await getAuthenticatedUser();
  if (user === null) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const { id } = await params;

  let falloCarga = false;
  let product: AdminProduct | null = null;
  try {
    product = await getAdminProductById(id);
  } catch (error: unknown) {
    console.warn(
      `[panel] no se pudo cargar el producto ${id} (${
        error instanceof Error ? error.message : "sin detalle"
      }).`,
    );
    falloCarga = true;
  }

  const volver = (
    <Link
      href="/admin"
      className="inline-flex items-center gap-2 text-sm font-semibold text-green-800/80 underline-offset-4 transition-colors hover:text-green-800 hover:underline"
    >
      <IconArrowLeft className="h-4 w-4" />
      Volver al panel
    </Link>
  );

  // Sin fila (id que no es UUID o ficha que ya no existe) o sin conexión:
  // aviso DENTRO del panel, con vuelta a la lista.
  if (falloCarga || product === null) {
    return (
      <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {volver}
        <div className="mt-5 rounded-2xl border-2 border-gold-600/60 p-1.5">
          <div className="rounded-xl p-6 ring-1 ring-inset ring-gold-600/40 sm:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-green-800">
              {falloCarga
                ? "No pudimos cargar el producto"
                : "Ese producto no existe"}
            </h1>
            <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-green-800/75">
              {falloCarga
                ? "Revisa tu conexión y vuelve a intentar desde el panel."
                : "Puede que la ficha se haya borrado desde el dashboard de Supabase. Vuelve al panel y recarga la lista."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {volver}

      <div className="mt-5 rounded-2xl border-2 border-gold-600/60 p-1.5">
        <div className="rounded-xl p-5 ring-1 ring-inset ring-gold-600/40 sm:p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-green-800 sm:text-3xl">
            Editar producto
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-green-800/75">
            Los cambios se ven en el sitio al refrescarlo, sin redeployar.
          </p>
          <div className="mt-6">
            <AdminProductForm mode="edit" product={product} />
          </div>
        </div>
      </div>
    </section>
  );
}
