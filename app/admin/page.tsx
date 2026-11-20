import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconLeaf, IconStar } from "@/components/icons";
import { ADMIN_LOGIN_PATH } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";
import { listAdminProducts, type AdminProduct } from "@/lib/admin-products";
import {
  DEFAULT_ADMIN_FILTERS,
  adminProductsHref,
  filterAdminProducts,
  hasActiveFilters,
  normalizeSearchText,
  parseAdminFilters,
  type AdminFilters,
  type AdminOrderFilter,
  type AdminStatusFilter,
} from "@/lib/admin-filters";
import { CATEGORIES, CATEGORY_INFO } from "@/lib/types";
import { logoutAction } from "./actions";

/**
 * Interior del panel admin (F2.3): la LISTA del catálogo, con búsqueda,
 * filtros y orden.
 *
 * Server component con sesión garantizada por el middleware — el chequeo
 * de abajo es defensivo (F2.2): sin sesión a la puerta, pase lo que
 * pase con las cookies a mitad de vuelo.
 *
 * El panel ve TODAS las filas (published y retired: retirar es un estado
 * normal y reversible, no un error), leídas con el cliente autenticado.
 * El sitio público solo sirve las published: ese filtro es en código
 * (lib/supabase-catalog.ts), no en la policy de la base (ver README,
 * sección "Panel de administración").
 *
 * Los filtros viven en la URL (searchParams), parseados por
 * lib/admin-filters.ts: una vista armada se recarga, guarda o comparte
 * tal cual, y no hay estado de cliente que sincronizar. Los controles
 * son <Link> a URLs que arma el mismo helper + un formulario GET por
 * la búsqueda.
 *
 * 0 JS — la pieza 0-JS del sitio: el panel de filtros es un
 * <details>/<summary> nativo (CSS-only) que se abre solo server-side
 * (open={hasActiveFilters}) cuando la URL trae filtros, y en desktop se
 * acomoda como sidebar lateral vía grid responsivo condicionado por
 * has-[details[open]]. Sin JavaScript la página arma, filtra, ordena y
 * colapsa exactamente igual.
 *
 * Mobile-first: el dueño edita desde el teléfono en el mostrador. Cada
 * fila es un <Link> entero (tap generoso) y los chips son tocables.
 */

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

/** Mensajes del banner ?ok= (feedback tras guardar desde el formulario). */
const MENSAJES_OK: Record<string, string> = {
  creado: "Producto creado y publicado en el catálogo.",
  guardado: "Cambios guardados: el sitio se actualiza al refrescarlo.",
  retirado:
    "Producto retirado del catálogo. Puedes volver a publicarlo cuando quieras.",
  publicado: "Producto publicado de nuevo en el catálogo.",
};

/** Toma el primer valor de un parámetro (por si viene repetido). */
function primerParametro(
  valor: string | string[] | undefined,
): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Opciones del filtro de estado (los valores viajan en la URL). */
const OPCIONES_ESTADO: ReadonlyArray<{
  valor: AdminStatusFilter;
  etiqueta: string;
}> = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "publicados", etiqueta: "Publicados" },
  { valor: "retirados", etiqueta: "Retirados" },
];

/** Opciones de orden de la lista. */
const OPCIONES_ORDEN: ReadonlyArray<{
  valor: AdminOrderFilter;
  etiqueta: string;
}> = [
  { valor: "posicion", etiqueta: "Posición" },
  { valor: "nombre", etiqueta: "Nombre A–Z" },
  { valor: "editados", etiqueta: "Últimos editados" },
];

/** Clases base de un chip: píldora tocable, sin estados de foco propios
 *  (el :focus-visible global de globals.css les da el anillo). */
const CLASE_CHIP =
  "inline-flex min-w-0 touch-manipulation items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors";

/** Chip activo (verde sólido) vs inactivo (quieto, realce al pasar). */
function claseChip(activo: boolean): string {
  return activo
    ? `${CLASE_CHIP} border-green-700 bg-green-700 font-semibold text-white`
    : `${CLASE_CHIP} border-sand bg-white font-medium text-green-800 hover:border-gold-400 hover:bg-gold-50`;
}

/** Un chip de la barra de filtros: un <Link> que navega con la URL armada
 *  por adminProductsHref — cero estado local. */
function Chip({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "true" : undefined}
      className={claseChip(activo)}
    >
      {children}
    </Link>
  );
}

/** Etiqueta pequeña de un grupo de chips (legible y con aria). */
function EtiquetaGrupo({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <span id={id} className="text-xs font-semibold text-green-800/60">
      {children}
    </span>
  );
}

/**
 * Cuenta cuántos filtros que OCULTAN productos están activos, para el
 * badge "(N)" del botón del panel colapsable. Suma los mismos predicados
 * que `hasActiveFilters` (lib/admin-filters.ts): texto, estado, categoría
 * y destacados. El orden NO cuenta (reordenar no filtra).
 *
 * Vive acá y no en lib/admin-filters.ts (módulo firmado, no se toca):
 * es presentación del panel, no lógica de filtros. Los predicados son
 * los mismos que cubren los tests de hasActiveFilters, así que su
 * corrección se transita desde ahí.
 */
function contarFiltrosActivos(filtros: AdminFilters): number {
  return (
    (normalizeSearchText(filtros.search) !== "" ? 1 : 0) +
    (filtros.status !== "todos" ? 1 : 0) +
    (filtros.category !== "todas" ? 1 : 0) +
    (filtros.featuredOnly ? 1 : 0)
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getAuthenticatedUser();
  if (user === null) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const params = await searchParams;
  const okParam = primerParametro(params.ok);
  const mensajeOk = okParam !== undefined ? (MENSAJES_OK[okParam] ?? null) : null;
  const filtros = parseAdminFilters(params);

  // Sin fallback a products.json a propósito: el panel administra la
  // base REAL. Si no se puede leer, se muestra el error y un reintento
  // — jamás editarías "el respaldo" creyendo que editás el catálogo.
  let products: AdminProduct[] | null = null;
  let falloCarga = false;
  try {
    products = await listAdminProducts();
  } catch (error: unknown) {
    console.warn(
      `[panel] no se pudo listar el catálogo (${
        error instanceof Error ? error.message : "sin detalle"
      }).`,
    );
    falloCarga = true;
  }

  // La lista que se muestra: filtrada y ordenada por los searchParams.
  const visibles =
    products === null ? [] : filterAdminProducts(products, filtros);
  const hayFiltros = hasActiveFilters(filtros);
  // Cuenta de filtros activos para el badge del botón (el orden no cuenta).
  const filtrosActivos = contarFiltrosActivos(filtros);
  // El conteo de retirados solo interesa cuando la lista los incluye.
  const retiradosVisibles =
    filtros.status === "todos"
      ? visibles.filter((p) => p.status === "retired").length
      : 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Header compacto (F1): barra fina de 1 línea, no card ni filete
          dorado. Título chico + email sutil + acciones inline. El panel
          de filtros vive abajo en un <details> CSS-only (F2). */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-sand pb-3">
        <h1 className="font-display text-lg font-semibold tracking-tight text-green-800">
          Panel admin
        </h1>
        {user.email != null ? (
          <span
            className="hidden text-sm text-green-800/55 sm:inline"
            translate="no"
          >
            {user.email}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href="/admin/productos/nuevo"
            className="inline-flex items-center justify-center rounded-full bg-terracotta-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-700"
          >
            Nuevo producto
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-green-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      {/* Banner ?ok= (feedback tras guardar) — debajo del header compacto. */}
      {mensajeOk !== null ? (
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
            No pudimos cargar el catálogo desde Supabase.
          </p>
          <p className="mt-1">
            Revisa tu conexión y{" "}
            <Link
              href="/admin"
              className="font-semibold underline underline-offset-4"
            >
              vuelve a intentar
            </Link>
            . Mientras tanto, el sitio público sigue sirviendo su última
            versión.
          </p>
        </div>
      ) : products !== null && products.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-12 text-center sm:py-16">
          <p className="font-display text-xl font-semibold text-green-800">
            Todavía no hay productos
          </p>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-green-800/70">
            Crea la primera ficha del catálogo: foto, nombre, familia y
            descripción. Tarda un par de minutos desde el teléfono.
          </p>
          <Link
            href="/admin/productos/nuevo"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-terracotta-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-terracotta-700"
          >
            Crear el primer producto
          </Link>
        </div>
      ) : products !== null ? (
        <>
          {/* Panel de filtros colapsable (CSS-only <details>/<summary>, F2):
              se abre solo server-side cuando la URL trae filtros
              (open={hayFiltros}). El <summary> es el botón "Filtros (N)"
              con badge server-side (F3). Todo navega por URL (links +
              form GET): sin JavaScript queda igual de funcional y una
              vista armada se puede recargar o guardar. Los chips ocultos
              viajan como inputs hidden del form para que una búsqueda no
              pierda el resto de la vista.

              Desktop abierto: grid 2-col (aside izq fijo + contenido der),
              vía has-[details[open]]. Desktop cerrado: la lista ocupa
              todo el ancho (el :has no matchea → grid 1-col). Mobile:
              aside inline vertical arriba de la lista (no hay ancho para
              sidebar). */}
          <div className="mt-4 lg:grid lg:items-start lg:gap-6 lg:has-[details[open]]:grid-cols-[18rem_minmax(0,1fr)]">
            <details open={hayFiltros} className="group">
              <summary
                className={
                  "inline-flex cursor-pointer list-none items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden " +
                  (filtrosActivos > 0
                    ? "border-terracotta-400 bg-terracotta-50 text-terracotta-900 hover:bg-terracotta-100"
                    : "border-sand bg-white text-green-800 hover:border-gold-400 hover:bg-gold-50")
                }
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 4.5 6 7.5 9 4.5" />
                </svg>
                <span>Filtros</span>
                {filtrosActivos > 0 ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta-600 px-1.5 text-xs font-bold leading-none text-white"
                    >
                      {filtrosActivos}
                    </span>
                    <span className="sr-only">
                      {" "}
                      ({filtrosActivos}{" "}
                      {filtrosActivos === 1
                        ? "filtro activo"
                        : "filtros activos"}
                      )
                    </span>
                  </>
                ) : null}
              </summary>

              <aside
                aria-label="Filtros del catálogo"
                className="mt-3 flex flex-col gap-4 rounded-2xl border border-sand/80 bg-white/70 p-4 sm:p-5"
              >
                <form method="get" action="/admin" role="search" className="flex gap-2">
                  <label htmlFor="q-panel" className="sr-only">
                    Buscar producto
                  </label>
                  <input
                    id="q-panel"
                    name="q"
                    type="search"
                    autoComplete="off"
                    inputMode="search"
                    enterKeyHint="search"
                    placeholder="Buscar por nombre o palabra…"
                    defaultValue={filtros.search}
                    className="min-w-0 flex-1 rounded-md border border-sand bg-white px-3.5 py-2.5 text-base text-green-900 transition-colors placeholder:text-green-800/40 focus:border-green-600"
                  />
                  {filtros.status !== "todos" ? (
                    <input type="hidden" name="estado" value={filtros.status} />
                  ) : null}
                  {filtros.category !== "todas" ? (
                    <input type="hidden" name="categoria" value={filtros.category} />
                  ) : null}
                  {filtros.featuredOnly ? (
                    <input type="hidden" name="destacados" value="1" />
                  ) : null}
                  {filtros.order !== "posicion" ? (
                    <input type="hidden" name="orden" value={filtros.order} />
                  ) : null}
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-green-300 bg-transparent px-5 py-2.5 text-base font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50"
                  >
                    Buscar
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <EtiquetaGrupo id="etiqueta-estado">Estado</EtiquetaGrupo>
                  <ul
                    aria-labelledby="etiqueta-estado"
                    className="flex flex-wrap gap-2"
                  >
                    {OPCIONES_ESTADO.map((opcion) => (
                      <li key={opcion.valor}>
                        <Chip
                          href={adminProductsHref({
                            ...filtros,
                            status: opcion.valor,
                          })}
                          activo={filtros.status === opcion.valor}
                        >
                          {opcion.etiqueta}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                  <Chip
                    href={adminProductsHref({
                      ...filtros,
                      featuredOnly: !filtros.featuredOnly,
                    })}
                    activo={filtros.featuredOnly}
                  >
                    <IconStar className="h-3.5 w-3.5 shrink-0" />
                    Solo destacados
                  </Chip>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <EtiquetaGrupo id="etiqueta-categoria">Categoría</EtiquetaGrupo>
                  <ul
                    aria-labelledby="etiqueta-categoria"
                    className="flex flex-wrap gap-2"
                  >
                    <li>
                      <Chip
                        href={adminProductsHref({ ...filtros, category: "todas" })}
                        activo={filtros.category === "todas"}
                      >
                        Todas
                      </Chip>
                    </li>
                    {CATEGORIES.map((category) => (
                      <li key={category}>
                        <Chip
                          href={adminProductsHref({ ...filtros, category })}
                          activo={filtros.category === category}
                        >
                          {CATEGORY_INFO[category].name}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <EtiquetaGrupo id="etiqueta-orden">Orden</EtiquetaGrupo>
                  <ul aria-labelledby="etiqueta-orden" className="flex flex-wrap gap-2">
                    {OPCIONES_ORDEN.map((opcion) => (
                      <li key={opcion.valor}>
                        <Chip
                          href={adminProductsHref({ ...filtros, order: opcion.valor })}
                          activo={filtros.order === opcion.valor}
                        >
                          {opcion.etiqueta}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </details>

            <div className="mt-4 lg:mt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-medium text-green-800/70">
                  {hayFiltros
                    ? `${visibles.length} de ${products.length} ${
                        products.length === 1 ? "producto" : "productos"
                      }`
                    : `${products.length} ${
                        products.length === 1 ? "producto" : "productos"
                      }`}
                  {retiradosVisibles > 0
                    ? ` · ${retiradosVisibles} ${
                        retiradosVisibles === 1 ? "retirado" : "retirados"
                      } (ocultos del sitio)`
                    : ""}
                </p>
                {hayFiltros ? (
                  <Link
                    href={adminProductsHref(DEFAULT_ADMIN_FILTERS)}
                    className="text-sm font-semibold text-green-800 underline underline-offset-4 transition-colors hover:text-green-700"
                  >
                    Limpiar filtros
                  </Link>
                ) : null}
              </div>

              {visibles.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-10 text-center sm:py-12">
                  <p className="font-display text-xl font-semibold text-green-800">
                    Ningún producto coincide
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-green-800/70">
                    Prueba con otra palabra, o quita los filtros para volver a ver
                    todo el catálogo.
                  </p>
                  <Link
                    href={adminProductsHref(DEFAULT_ADMIN_FILTERS)}
                    className="mt-5 inline-flex items-center justify-center rounded-full border border-green-300 bg-transparent px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50"
                  >
                    Limpiar filtros
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {visibles.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/admin/productos/${product.id}`}
                        aria-label={`Editar ${product.name}`}
                        className="flex items-center gap-3.5 rounded-xl border border-sand/80 bg-white p-3 transition-colors hover:border-gold-400 sm:gap-4 sm:p-4"
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-dark sm:h-20 sm:w-20">
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h2 className="font-display text-base font-semibold leading-snug text-green-800 sm:text-lg">
                              {product.name}
                            </h2>
                            {product.featured ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gold-300 bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-900">
                                <IconStar className="h-3 w-3" />
                                Destacado
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-green-800/70 sm:text-sm">
                            {CATEGORY_INFO[product.category].name}
                            <span className="text-green-800/50"> · #{product.position}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {product.status === "published" ? (
                              <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                Publicado
                              </span>
                            ) : (
                              <span className="rounded-full border border-sand bg-cream-dark px-2 py-0.5 text-xs font-medium text-green-800/70">
                                Retirado
                              </span>
                            )}
                            {product.price !== null ? (
                              <span className="text-sm font-semibold text-gold-800">
                                ${product.price} MXN
                              </span>
                            ) : (
                              <span className="text-sm text-green-800/50">
                                —
                                <span className="sr-only">
                                  {" "}
                                  sin precio (se consulta por WhatsApp)
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
