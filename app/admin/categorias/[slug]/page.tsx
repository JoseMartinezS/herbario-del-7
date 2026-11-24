import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { ADMIN_LOGIN_PATH } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";
import { getCategoryList } from "@/lib/categories";
import { isValidSlug } from "@/lib/slugify";
import {
  DESCRIPCION_CATEGORIA_MAX,
  NOMBRE_CATEGORIA_MAX,
  POSICION_CATEGORIA_MAX,
  echoCategoriaDesdeParams,
  mensajeErrorDesdeParams,
} from "@/lib/admin-categories";
import { guardarCategoriaAction } from "../actions";

/**
 * Editar una familia (F2.5, F4): nombre, descripción y posición.
 *
 * El slug llega por URL y es INMUTABLE (precedente del slug de producto):
 * se muestra como texto y viaja al server solo como IDENTIFICADOR hidden
 * del .eq("slug", …) — jamás como campo editable, porque fichas y filtros
 * ya lo usan y la FK haría cascada.
 *
 * Sin fila (slug mal formado o familia borrada desde el dashboard) se
 * muestra un aviso DENTRO del panel con vuelta a la lista — no la 404
 * pública: acá el contexto es el dueño, no un visitante.
 */

export const metadata: Metadata = {
  title: "Editar categoría",
  robots: { index: false, follow: false },
};

interface EditarCategoriaPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditarCategoriaPage({
  params,
  searchParams,
}: EditarCategoriaPageProps) {
  // Defensivo (el proxy ya exige sesión para /admin/*).
  const user = await getAuthenticatedUser();
  if (user === null) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const { slug } = await params;
  const categorias = await getCategoryList();
  const categoria = isValidSlug(slug)
    ? categorias.find((item) => item.slug === slug)
    : undefined;

  // Banner ?error= + echo-back: el eco SOLO manda con error — sin error
  // los inputs muestran los valores guardados.
  const search = await searchParams;
  const mensajeError = mensajeErrorDesdeParams(search);
  const eco = echoCategoriaDesdeParams(search);
  const huboError = mensajeError !== null;

  const volver = (
    <Link
      href="/admin/categorias"
      className="inline-flex items-center gap-2 text-sm font-semibold text-green-800/80 underline-offset-4 transition-colors hover:text-green-800 hover:underline"
    >
      <IconArrowLeft className="h-4 w-4" />
      Volver a categorías
    </Link>
  );

  // Sin fila: aviso dentro del panel, con vuelta a la lista.
  if (categoria === undefined) {
    return (
      <section className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {volver}
        <div className="mt-5 rounded-2xl border-2 border-gold-600/60 p-1.5">
          <div className="rounded-xl p-6 ring-1 ring-inset ring-gold-600/40 sm:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-green-800">
              Esa familia no existe
            </h1>
            <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-green-800/75">
              Puede que la hayan borrado desde el dashboard de Supabase, o
              que el enlace sea viejo. Vuelve a la lista y recarga: lo que
              exista ahí es lo vigente.
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
            Editar familia
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-green-800/75">
            Los cambios se ven en el sitio al refrescarlo, sin redeployar.
            La dirección ({categoria.slug}) no se puede cambiar.
          </p>

          {mensajeError !== null ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-terracotta-300 bg-terracotta-50 px-4 py-3.5 text-pretty text-sm leading-relaxed text-terracotta-900"
            >
              <p>{mensajeError}</p>
            </div>
          ) : null}

          <form action={guardarCategoriaAction} className="mt-6 flex flex-col gap-6">
            {/* El slug viaja como IDENTIFICADOR del .eq("slug", …), nunca
                como dato editable (ver guardarCategoriaAction). */}
            <input type="hidden" name="slug" value={categoria.slug} />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="categoria-nombre"
                className="text-sm font-semibold text-green-800"
              >
                Nombre
              </label>
              <input
                id="categoria-nombre"
                name="nombre"
                type="text"
                required
                maxLength={NOMBRE_CATEGORIA_MAX}
                autoComplete="off"
                placeholder="p. ej. Amuletos y talismanes"
                defaultValue={huboError ? eco.nombre : categoria.nombre}
                className="w-full rounded-md border border-sand bg-white px-3.5 py-2.5 text-base text-green-900 transition-colors placeholder:text-green-800/40 focus:border-green-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="categoria-descripcion"
                className="text-sm font-semibold text-green-800"
              >
                Descripción (opcional)
              </label>
              <textarea
                id="categoria-descripcion"
                name="descripcion"
                rows={2}
                maxLength={DESCRIPCION_CATEGORIA_MAX}
                placeholder="Una línea para la grilla del inicio."
                defaultValue={
                  huboError ? eco.descripcion : categoria.descripcion
                }
                className="w-full resize-y rounded-md border border-sand bg-white px-3.5 py-2.5 text-base text-green-900 transition-colors placeholder:text-green-800/40 focus:border-green-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="categoria-posicion"
                className="text-sm font-semibold text-green-800"
              >
                Posición
              </label>
              <input
                id="categoria-posicion"
                name="posicion"
                type="number"
                required
                min={1}
                max={POSICION_CATEGORIA_MAX}
                step={1}
                inputMode="numeric"
                defaultValue={
                  huboError ? eco.posicion : String(categoria.posicion)
                }
                className="w-28 rounded-md border border-sand bg-white px-3.5 py-2.5 text-base tabular-nums text-green-900 transition-colors focus:border-green-600"
              />
              <p className="text-xs leading-relaxed text-green-800/65">
                Orden de exhibición: 1 es la primera familia de la grilla del
                inicio y de los filtros del catálogo.
              </p>
            </div>

            <div className="rounded-xl bg-cream-dark/60 px-4 py-3.5 text-sm leading-relaxed text-green-800/75">
              <p>
                Dirección de la familia:{" "}
                <span className="font-medium text-green-800" translate="no">
                  /catalogo?categoria={categoria.slug}
                </span>{" "}
                — no se puede cambiar (las fichas y los filtros ya la usan).
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full bg-terracotta-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-terracotta-700 sm:w-auto"
              >
                Guardar cambios
              </button>
              <Link
                href="/admin/categorias"
                className="inline-flex w-full items-center justify-center rounded-full border border-green-300 bg-transparent px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50 sm:w-auto"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
