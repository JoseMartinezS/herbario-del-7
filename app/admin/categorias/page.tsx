import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconArrowLeft, IconLeaf } from "@/components/icons";
import { ADMIN_LOGIN_PATH } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";
import { getCategoryList } from "@/lib/categories";
import { listAdminProducts, type AdminProduct } from "@/lib/admin-products";
import {
  DESCRIPCION_CATEGORIA_MAX,
  NOMBRE_CATEGORIA_MAX,
  contarProductosPorCategoria,
  echoCategoriaDesdeParams,
  mensajeErrorDesdeParams,
  mensajeOkDesdeParams,
  textoDeConteo,
} from "@/lib/admin-categories";
import { crearCategoriaAction, eliminarCategoriaAction } from "./actions";

/**
 * Categorías del panel (F2.5, F4): la LISTA de familias + el alta inline.
 *
 * 0 JS como el resto del panel: el alta es un <form> plano a una Server
 * Action, la eliminación se confirma con un <details> CSS-only por fila
 * (misma filosofía que el panel de filtros) y todo el feedback va por URL
 * (PRG): ?ok= / ?error= con el echo-back que re-llena lo tipeado.
 *
 * Las categorías se leen de getCategoryList (datos, no enum) y los conteos
 * salen de la MISMA lista de productos que ya carga el panel: ninguna
 * query extra. Los conteos separan publicados de retirados porque la
 * eliminación (como la FK) cuenta ambos.
 */

export const metadata: Metadata = {
  title: "Categorías",
  robots: { index: false, follow: false },
};

interface CategoriasAdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CategoriasAdminPage({
  searchParams,
}: CategoriasAdminPageProps) {
  // Defensivo (el proxy ya exige sesión para /admin/*).
  const user = await getAuthenticatedUser();
  if (user === null) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const params = await searchParams;
  // Banners PRG: el error gana si la URL trajera ambos (nunca debería).
  const mensajeError = mensajeErrorDesdeParams(params);
  const mensajeOk =
    mensajeError === null ? mensajeOkDesdeParams(params) : null;
  // Echo-back: solo manda con ?error= — sin error el alta arranca limpio.
  const eco = echoCategoriaDesdeParams(params);
  const huboError = mensajeError !== null;

  const categorias = await getCategoryList();

  // Los conteos por familia salen de la misma tabla que la lista del
  // panel. Sin fallback a propósito (como en /admin): si la base no
  // responde, se avisa y las filas se ven sin conteo — las categorías
  // sí se muestran porque su fuente tiene fallback propio.
  let products: AdminProduct[] | null = null;
  let falloCarga = false;
  try {
    products = await listAdminProducts();
  } catch (error: unknown) {
    console.warn(
      `[panel] no se pudieron contar los productos por categoría (${
        error instanceof Error ? error.message : "sin detalle"
      }).`,
    );
    falloCarga = true;
  }
  const conteos =
    products === null ? null : contarProductosPorCategoria(products);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-semibold text-green-800/80 underline-offset-4 transition-colors hover:text-green-800 hover:underline"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver al panel
      </Link>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-green-800 sm:text-3xl">
          Categorías
        </h1>
        <p className="text-sm text-green-800/60">
          {categorias.length}{" "}
          {categorias.length === 1 ? "familia" : "familias"}
        </p>
      </div>
      <p className="mt-2 max-w-prose text-pretty text-sm leading-relaxed text-green-800/75">
        Las familias del mostrador: nombre, descripción y orden de exhibición.
        La dirección (slug) se arma sola a partir del nombre y no se puede
        cambiar después — lo demás, sí.
      </p>

      {mensajeError !== null ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-terracotta-300 bg-terracotta-50 px-4 py-3.5 text-pretty text-sm leading-relaxed text-terracotta-900"
        >
          <p>{mensajeError}</p>
        </div>
      ) : mensajeOk !== null ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-pretty text-sm leading-relaxed text-green-800"
        >
          <IconLeaf className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <p>{mensajeOk}</p>
        </div>
      ) : null}

      {falloCarga ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-terracotta-300 bg-terracotta-50 px-4 py-4 text-pretty text-sm leading-relaxed text-terracotta-900"
        >
          <p className="font-semibold">
            No pudimos contar los productos desde Supabase.
          </p>
          <p className="mt-1">
            Las familias se ven igual, pero sin conteo.{" "}
            <Link
              href="/admin/categorias"
              className="font-semibold underline underline-offset-4"
            >
              Vuelve a intentar
            </Link>{" "}
            cuando la conexión vuelva.
          </p>
        </div>
      ) : null}

      {/* Alta inline: dos campos, sin página propia — crear una familia es
          un paso corto que nace de la lista. El required nativo frenaría
          el submit vacío incluso sin JS; zod vuelve a validar en el server. */}
      <form
        action={crearCategoriaAction}
        className="mt-5 flex flex-col gap-4 rounded-2xl border border-sand/80 bg-white/70 p-4 sm:p-5"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-green-800">
            Nueva familia
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-green-800/65">
            Se publica al instante: aparece en la grilla del inicio, en los
            filtros del catálogo y en el formulario de producto.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="categoria-nueva-nombre"
            className="text-sm font-semibold text-green-800"
          >
            Nombre
          </label>
          <input
            id="categoria-nueva-nombre"
            name="nombre"
            type="text"
            required
            maxLength={NOMBRE_CATEGORIA_MAX}
            autoComplete="off"
            placeholder="p. ej. Amuletos y talismanes"
            defaultValue={huboError ? eco.nombre : ""}
            className="w-full rounded-md border border-sand bg-white px-3.5 py-2.5 text-base text-green-900 transition-colors placeholder:text-green-800/40 focus:border-green-600"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="categoria-nueva-descripcion"
            className="text-sm font-semibold text-green-800"
          >
            Descripción (opcional)
          </label>
          <textarea
            id="categoria-nueva-descripcion"
            name="descripcion"
            rows={2}
            maxLength={DESCRIPCION_CATEGORIA_MAX}
            placeholder="Una línea para la grilla del inicio."
            defaultValue={huboError ? eco.descripcion : ""}
            className="w-full resize-y rounded-md border border-sand bg-white px-3.5 py-2.5 text-base text-green-900 transition-colors placeholder:text-green-800/40 focus:border-green-600"
          />
        </div>
        <div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-terracotta-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-terracotta-700"
          >
            Crear familia
          </button>
        </div>
      </form>

      {/* Lista de familias: nombre, slug, descripción, conteo y posición
          (el orden de la grilla del inicio) + Editar / Eliminar. */}
      <ul className="mt-6 flex flex-col gap-3">
        {categorias.map((categoria) => {
          const conteo = conteos?.get(categoria.slug) ?? null;
          const totalFichas =
            conteo === null ? 0 : conteo.publicados + conteo.retirados;
          return (
            <li
              key={categoria.slug}
              className="rounded-xl border border-sand/80 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 className="font-display text-base font-semibold leading-snug text-green-800 sm:text-lg">
                  {categoria.nombre}
                </h2>
                <span className="text-xs font-medium text-green-800/50">
                  #{categoria.posicion}
                </span>
              </div>
              <p
                className="mt-0.5 font-mono text-xs text-green-800/55"
                translate="no"
              >
                {categoria.slug}
              </p>
              {categoria.descripcion !== "" ? (
                <p className="mt-1.5 max-w-prose text-pretty text-sm leading-relaxed text-green-800/70">
                  {categoria.descripcion}
                </p>
              ) : null}
              <p className="mt-1.5 text-xs font-medium text-green-800/60">
                {conteo === null ? "" : textoDeConteo(conteo.publicados, conteo.retirados)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/categorias/${categoria.slug}`}
                  aria-label={`Editar ${categoria.nombre}`}
                  className="inline-flex items-center justify-center rounded-full border border-green-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50"
                >
                  Editar
                </Link>

                {/* Confirmación CSS-only (misma filosofía que el <details>
                    de filtros): abrir revela la advertencia y el submit.
                    La advertencia es server-side por fila — si tiene fichas
                    se avisa ANTES del click; el pre-check de la action es
                    el que manda (la DB es el último muro). */}
                <details className="group">
                  <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-terracotta-300 bg-white px-4 py-2.5 text-sm font-semibold text-terracotta-800 transition-colors hover:bg-terracotta-50 [&::-webkit-details-marker]:hidden">
                    Eliminar
                  </summary>
                  <div className="mt-2 max-w-md rounded-xl border border-terracotta-200 bg-terracotta-50 p-3.5">
                    <p className="text-sm leading-relaxed text-terracotta-900">
                      {totalFichas > 0
                        ? `«${categoria.nombre}» tiene ${totalFichas} ${
                            totalFichas === 1 ? "ficha" : "fichas"
                          } (incluye retiradas): hay que moverlas o eliminarlas antes.`
                        : `«${categoria.nombre}» se borra del catálogo para siempre. No tiene fichas, así que el borrado es limpio.`}
                    </p>
                    <form action={eliminarCategoriaAction} className="mt-3">
                      <input
                        type="hidden"
                        name="slug"
                        value={categoria.slug}
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-700"
                      >
                        Eliminar familia
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
