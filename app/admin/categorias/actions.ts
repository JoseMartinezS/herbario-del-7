"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH, getSupabaseAuthConfig } from "@/lib/supabase-auth";
import {
  createSupabaseAuthClient,
  getAuthenticatedUser,
} from "@/lib/supabase-auth-server";
import { isValidSlug, slugify } from "@/lib/slugify";
import { invalidateCategoriesCache } from "@/lib/categories";
import {
  DESCRIPCION_CATEGORIA_MAX,
  NOMBRE_CATEGORIA_MAX,
  categoriaCreateSchema,
  categoriaEditSchema,
  contarProductosDeCategoria,
  existeCategoria,
  siguientePosicionDeCategoria,
  slugDeCategoriaValido,
} from "@/lib/admin-categories";

/**
 * Server Actions del CRUD de categorías del panel (F2.5, F4).
 *
 * A diferencia de las actions de PRODUCTOS (que devuelven { error } a un
 * formulario cliente), acá no hay componente cliente: los formularios son
 * HTML planos (0 JS) y el feedback va por PRG — POST → redirect con clave
 * en la URL, la página traduce la clave a banner y re-llena los inputs con
 * lo tipeado (echo-back). La acción JAMÁS renderiza ella misma: refrescar
 * el resultado no repite la mutación.
 *
 * Reglas de la casa (heredadas de productos, F2.3):
 * - la sesión se verifica ADENTRO (defensa en profundidad: una action es
 *   un endpoint más, el proxy ya frenó el 99% de los casos);
 * - zod valida en el servidor (nunca se confía en el cliente);
 * - el slug NACE del nombre (slugify) y no se acepta del cliente jamás —
 *   en edición es solo el IDENTIFICADOR del .eq("slug", …);
 * - el redirect de ÉXITO va FUERA del try/catch (redirect() lanza una
 *   señal interna de Next que no debe tragarse un catch).
 */

/** Destino común de los banners: la lista de categorías. */
const RUTA_LISTA = "/admin/categorias";

/** Traduce un error de Postgres a una clave de banner. */
function traducirErrorCategoria(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === "23505") {
    // unique_violation: carrera de dos altas con el mismo nombre.
    return "duplicado";
  }
  if (error.code === "23514") {
    // check_violation: el CHECK de slug de la tabla (defensa del último muro).
    return "datos-invalidos";
  }
  return "no-guardado";
}

/**
 * Arma la URL de resultado con SOLO los parámetros con valor: los éxitos
 * llevan ?ok=…, los fallos ?error=… + el echo-back de lo tipeado.
 */
function urlConResultado(
  base: string,
  params: Record<string, string | number | null>,
): string {
  const search = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== null && valor !== "") {
      search.set(clave, String(valor));
    }
  }
  const query = search.toString();
  return query === "" ? base : `${base}?${query}`;
}

/**
 * Invalida la lectura de categorías y marca las rutas afectadas para
 * regenerar (espejo de invalidarYRevalidar de productos, F2.3).
 *
 * El orden importa: la memoización de lib/categories.ts (TTL 60 s) se tumba
 * PRIMERO porque la regeneración de abajo pasa por getCategoryList — sin
 * esto podría servirse la copia vieja y la familia nueva no aparecería
 * hasta el minuto siguiente.
 *
 * /sitemap.xml no lista categorías (solo rutas fijas y fichas), así que no
 * hace falta tocarlo: una familia nueva no tiene URL propia, se filtra
 * desde /catalogo?categoria=… que sí se regenera.
 */
function invalidarYRevalidar(): void {
  invalidateCategoriesCache();
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/admin");
  revalidatePath("/admin/categorias");
}

/**
 * Alta de una familia: el slug nace del nombre y la posición es MAX+1.
 * Con nombre válido, descripción opcional y nada más — el dueño no toca
 * ni slug ni posición al crear.
 */
export async function crearCategoriaAction(formData: FormData): Promise<void> {
  // Defensa en profundidad (el proxy ya protege /admin/*).
  if ((await getAuthenticatedUser()) === null) {
    redirect(ADMIN_LOGIN_PATH);
  }
  if (getSupabaseAuthConfig() === null) {
    redirect(urlConResultado(RUTA_LISTA, { error: "sin-config" }));
  }

  const nombreCrudo = String(formData.get("nombre") ?? "");
  const descripcionCruda = String(formData.get("descripcion") ?? "");

  // Gate 1 — zod server: nombre/descripción con longitudes sanas.
  const campos = categoriaCreateSchema.safeParse({
    nombre: nombreCrudo,
    descripcion: descripcionCruda,
  });
  if (!campos.success) {
    redirect(
      urlConResultado(RUTA_LISTA, {
        error: "datos-invalidos",
        nombre: nombreCrudo.slice(0, NOMBRE_CATEGORIA_MAX),
        descripcion: descripcionCruda.slice(0, DESCRIPCION_CATEGORIA_MAX),
      }),
    );
  }

  // Gate 2 — el slug nace del nombre (jamás llega del cliente) y «todas»
  // es la palabra reservada de los filtros: no puede ser familia.
  const slug = slugify(campos.data.nombre);
  if (!slugDeCategoriaValido(slug)) {
    redirect(
      urlConResultado(RUTA_LISTA, {
        error: slug === "todas" ? "reservada" : "sin-slug",
        nombre: campos.data.nombre,
        descripcion: campos.data.descripcion,
      }),
    );
  }

  let fallo: string | null = null;
  try {
    if (await existeCategoria(slug)) {
      fallo = "duplicado";
    } else {
      const supabase = await createSupabaseAuthClient();
      // Posición automática: MAX(posicion)+1 (columna con default 1, pero el
      // sitio ordena por ella: la nueva familia va al final de la grilla).
      const posicion = await siguientePosicionDeCategoria();
      const { error: insertError } = await supabase.from("categories").insert({
        slug,
        nombre: campos.data.nombre,
        descripcion: campos.data.descripcion,
        posicion,
      });
      if (insertError !== null) {
        fallo = traducirErrorCategoria(insertError);
      }
    }
  } catch {
    fallo = "red";
  }

  if (fallo !== null) {
    redirect(
      urlConResultado(RUTA_LISTA, {
        error: fallo,
        nombre: campos.data.nombre,
        descripcion: campos.data.descripcion,
      }),
    );
  }

  invalidarYRevalidar();
  redirect(urlConResultado(RUTA_LISTA, { ok: "creada" }));
}

/**
 * Guarda los cambios de una familia existente: nombre, descripción y
 * posición. El slug llega como IDENTIFICADOR del formulario (hidden) y se
 * usa solo en el .eq("slug", …) — jamás se escribe (cambiarlo movería la
 * URL que fichas y filtros ya usan, y la FK haría cascada: cero).
 */
export async function guardarCategoriaAction(
  formData: FormData,
): Promise<void> {
  if ((await getAuthenticatedUser()) === null) {
    redirect(ADMIN_LOGIN_PATH);
  }
  if (getSupabaseAuthConfig() === null) {
    redirect(urlConResultado(RUTA_LISTA, { error: "sin-config" }));
  }

  const slug = String(formData.get("slug") ?? "");
  if (!isValidSlug(slug)) {
    redirect(urlConResultado(RUTA_LISTA, { error: "no-existe" }));
  }

  const nombreCrudo = String(formData.get("nombre") ?? "");
  const descripcionCruda = String(formData.get("descripcion") ?? "");
  const posicionCruda = String(formData.get("posicion") ?? "");

  const campos = categoriaEditSchema.safeParse({
    nombre: nombreCrudo,
    descripcion: descripcionCruda,
    posicion: Number(posicionCruda),
  });
  if (!campos.success) {
    redirect(
      urlConResultado(`/admin/categorias/${slug}`, {
        error: "datos-invalidos",
        nombre: nombreCrudo.slice(0, NOMBRE_CATEGORIA_MAX),
        descripcion: descripcionCruda.slice(0, DESCRIPCION_CATEGORIA_MAX),
        posicion: posicionCruda.slice(0, 8),
      }),
    );
  }

  let fallo: string | null = null;
  try {
    const supabase = await createSupabaseAuthClient();
    // .select() devuelve la fila actualizada: un arreglo vacío significa
    // que la familia ya no existe (la borraron del dashboard con la
    // edición abierta) — el UPDATE silencioso de 0 filas no puede pasar
    // por éxito.
    const { data: actualizadas, error: updateError } = await supabase
      .from("categories")
      .update({
        nombre: campos.data.nombre,
        descripcion: campos.data.descripcion,
        posicion: campos.data.posicion,
      })
      .eq("slug", slug)
      .select("slug");
    if (updateError !== null) {
      fallo = traducirErrorCategoria(updateError);
    } else if (!Array.isArray(actualizadas) || actualizadas.length === 0) {
      fallo = "no-existe";
    }
  } catch {
    fallo = "red";
  }

  if (fallo !== null) {
    // Sin fila no hay página de edición a la que volver: a la lista con
    // el aviso. El resto de los fallos vuelve AL formulario con el eco.
    if (fallo === "no-existe") {
      redirect(urlConResultado(RUTA_LISTA, { error: "no-existe" }));
    }
    redirect(
      urlConResultado(`/admin/categorias/${slug}`, {
        error: fallo,
        nombre: campos.data.nombre,
        descripcion: campos.data.descripcion,
        posicion: String(campos.data.posicion),
      }),
    );
  }

  invalidarYRevalidar();
  redirect(urlConResultado(RUTA_LISTA, { ok: "guardada" }));
}

/**
 * Elimina una familia (borrado FÍSICO, no hay "retirar" para familias: si
 * una familia sobra, se saca de la vitrina — las fichas no se borran
 * nunca y la FK las protege).
 *
 * Pre-check de fichas con el mismo criterio que la FK ON DELETE
 * RESTRICT: si tiene productos (publicados O retirados) se rechaza con
 * el mensaje claro; si la DB igual revienta por 23503 (entró una ficha en
 * la carrera), mismo mensaje — la cifra exacta es lo único que cambia.
 */
export async function eliminarCategoriaAction(
  formData: FormData,
): Promise<void> {
  if ((await getAuthenticatedUser()) === null) {
    redirect(ADMIN_LOGIN_PATH);
  }
  if (getSupabaseAuthConfig() === null) {
    redirect(urlConResultado(RUTA_LISTA, { error: "sin-config" }));
  }

  const slug = String(formData.get("slug") ?? "");
  if (!isValidSlug(slug)) {
    redirect(urlConResultado(RUTA_LISTA, { error: "no-existe" }));
  }

  let fallo: string | null = null;
  let productosEnUso: number | null = null;
  try {
    const enUso = await contarProductosDeCategoria(slug);
    if (enUso > 0) {
      fallo = "con-productos";
      productosEnUso = enUso;
    } else {
      const supabase = await createSupabaseAuthClient();
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("slug", slug);
      if (deleteError !== null) {
        if (deleteError.code === "23503") {
          // Carrera: el pre-check vio 0 fichas pero la FK frenó el
          // DELETE — mismo mensaje, sin cifra que ya no es confiable.
          fallo = "con-productos";
        } else {
          fallo = "no-guardado";
        }
      }
    }
  } catch {
    fallo = "red";
  }

  if (fallo !== null) {
    redirect(
      urlConResultado(RUTA_LISTA, {
        error: fallo,
        slug,
        ...(productosEnUso !== null ? { productos: productosEnUso } : {}),
      }),
    );
  }

  invalidarYRevalidar();
  redirect(urlConResultado(RUTA_LISTA, { ok: "eliminada" }));
}
