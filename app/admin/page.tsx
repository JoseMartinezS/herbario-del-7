import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconLeaf, IconStar } from "@/components/icons";
import { ADMIN_LOGIN_PATH } from "@/lib/supabase-auth";
import { getAuthenticatedUser } from "@/lib/supabase-auth-server";
import { listAdminProducts, type AdminProduct } from "@/lib/admin-products";
import { CATEGORY_INFO } from "@/lib/types";
import { logoutAction } from "./actions";

/**
 * Interior del panel admin (F2.3): la LISTA del catálogo.
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
 * Mobile-first: el dueño edita desde el teléfono en el mostrador. Cada
 * fila es un <Link> entero (tap generoso, funciona sin JavaScript).
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

  const retirados = products?.filter((p) => p.status === "retired").length ?? 0;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      {/* Doble filete dorado: la firma visual de la familia /admin. */}
      <div className="rounded-2xl border-2 border-gold-600/60 p-1.5">
        <div className="rounded-xl p-5 ring-1 ring-inset ring-gold-600/40 sm:p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-green-800 sm:text-3xl">
            Panel de administración
          </h1>
          <p className="mt-3 max-w-prose text-pretty text-sm leading-relaxed text-green-800/85 sm:text-base">
            Hola,{" "}
            <span className="font-semibold break-all" translate="no">
              {user.email ?? "tu cuenta"}
            </span>
            . Este es el catálogo del mostrador: toca un producto para
            editarlo.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/admin/productos/nuevo"
              className="inline-flex items-center justify-center rounded-full bg-terracotta-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-terracotta-700"
            >
              Nuevo producto
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full border border-green-300 bg-transparent px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50 sm:w-auto"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </div>

      {mensajeOk !== null ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-pretty text-sm leading-relaxed text-green-800"
        >
          <IconLeaf className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <p>{mensajeOk}</p>
        </div>
      ) : null}

      {falloCarga ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-terracotta-300 bg-terracotta-50 px-4 py-4 text-pretty text-sm leading-relaxed text-terracotta-900"
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
        <div className="mt-6 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-12 text-center sm:py-16">
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
          <p className="mt-6 text-sm font-medium text-green-800/70">
            {products.length}{" "}
            {products.length === 1 ? "producto" : "productos"}
            {retirados > 0
              ? ` · ${retirados} ${retirados === 1 ? "retirado" : "retirados"} (ocultos del sitio)`
              : ""}
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {products.map((product) => (
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
        </>
      ) : null}
    </section>
  );
}
