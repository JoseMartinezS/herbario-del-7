import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/AdminLoginForm";
import { IconSprig } from "@/components/icons";
import { sanitizeNextPath } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";

/**
 * La puerta del panel admin (F2.2): la única ruta de /admin que el
 * middleware deja pasar sin sesión.
 *
 * El parámetro `?next=` (a dónde volver tras entrar) llega por URL y se
 * sanea ACÁ, en el servidor, antes de tocar el DOM: solo paths internos.
 * La Server Action lo vuelve a sanear — al cliente no se le cree nada.
 *
 * Si ya hay una sesión activa, ni siquiera se muestra el formulario: se
 * redirige directo al destino. No hay registro público ni "olvidé mi
 * contraseña": el herbolario trabaja con UNA cuenta creada desde el
 * dashboard de Supabase (ver README, sección "Panel de administración").
 */

export const metadata: Metadata = {
  title: "Entrar al panel",
  description: "Acceso con cuenta para el personal del herbolario.",
  robots: { index: false, follow: false },
};

/** Toma el primer valor de un parámetro (por si viene repetido en la URL). */
function primerParametro(
  valor: string | string[] | undefined,
): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const destino = sanitizeNextPath(primerParametro(params.next));

  // ¿Ya con sesión? Directo al interior, sin mostrar la puerta.
  const user = await getAuthenticatedUser();
  if (user !== null) {
    redirect(destino);
  }

  return (
    <section className="mx-auto max-w-md px-4 py-14 sm:px-6 sm:py-20">
      {/* Tarjeta con el doble filete dorado: la firma visual de la familia
          /admin (el mismo tratamiento que usaba el placeholder del panel). */}
      <div className="rounded-2xl border-2 border-gold-600/60 p-1.5">
        <div className="rounded-xl p-6 ring-1 ring-inset ring-gold-600/40 sm:p-8">
          <IconSprig className="h-8 w-8 text-gold-500" />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-balance text-green-800 sm:text-3xl">
            Entrar al panel
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-green-800/75">
            Solo para el personal del herbolario.
          </p>
          <div className="mt-6">
            <AdminLoginForm nextPath={destino} />
          </div>
        </div>
      </div>
    </section>
  );
}
