"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_LOGIN_PATH,
  getSupabaseAuthConfig,
  sanitizeNextPath,
  translateAuthError,
} from "@/lib/supabase-auth";
import {
  createSupabaseAuthClient,
  clearAdminActivityCookie,
  getAuthenticatedUser,
  resetAdminActivityCookie,
} from "@/lib/supabase-auth-server";
import { slugify } from "@/lib/slugify";
import {
  buildPublicStorageUrl,
  buildStorageFileName,
  extensionFromMime,
  extractStorageFileName,
  isAllowedImageMime,
  MAX_IMAGE_BYTES,
  PRODUCTS_BUCKET,
} from "@/lib/storage";
import {
  adminProductFieldsSchema,
  adminProductSchema,
  type ProductStatus,
} from "@/lib/admin-schema";
import {
  getAdminProductById,
  getNextPosition,
  slugExists,
  type AdminProduct,
} from "@/lib/admin-products";
import { invalidateCatalogCache } from "@/lib/products";

/**
 * Server Actions del panel admin.
 *
 * F2.2 — login y logout: corren ÍNTEGRAMENTE en el servidor; la
 * contraseña nunca llega al bundle del cliente y la cookie de sesión
 * (httpOnly) la escribe el SDK desde acá. No hay cliente browser de
 * Supabase en este proyecto a propósito.
 *
 * F2.3 — crear/guardar producto: la SUBIDA DE LA FOTO también va por
 * acá. La foto llega ya comprimida desde el navegador (canvas, máx.
 * 1200 px, WebP — ver lib/image-upload.ts) y la action la sube al
 * bucket con el cliente autenticado del servidor. Así la CSP se queda
 * como está (connect-src 'self': el navegador solo habla con su propio
 * origen) y la sesión (cookies httpOnly) acompaña el upload sin exponer
 * nada al cliente. El costo: los cuerpos de las actions aceptan hasta
 * 10 mb (experimental.serverActions.bodySizeLimit, next.config.ts) —
 * el mismo techo del bucket.
 *
 * En éxito REDIRIGEN a /admin con ?ok=… (redirect FUERA del try/catch,
 * como loginAction: redirect() lanza una señal interna de Next que no
 * debe tragarse un catch).
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

  // Éxito: la cookie httpOnly ya la escribió el SDK. La cookie de
  // actividad también arranca fresca — si el navegador traía una vieja
  // de una sesión anterior, la sesión recién abierta no debe expirar
  // al instante (el middleware la renueva en cada request a /admin).
  await resetAdminActivityCookie();

  // Redirigir (fuera del try/catch) al destino saneado — re-saneado acá
  // porque el cliente pudo mandar cualquier cosa.
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
  // La cookie de actividad también es de la sesión: al cerrar no queda
  // rastro de la última visita (y un próximo login no hereda un timestamp
  // viejo que expiraría la sesión nueva al instante).
  await clearAdminActivityCookie();
  redirect(ADMIN_LOGIN_PATH);
}

/* ============================================================================
 * F2.3 — CRUD de productos (crear / guardar cambios / retirar-publicar)
 * ==========================================================================*/

/**
 * El middleware ya protege /admin/*, pero una Server Action es un
 * endpoint más del server: se verifica la sesión ADENTRO también
 * (defensa en profundidad — RLS es el tercer muro, en la base).
 */
const MENSAJE_NO_SESION =
  "Tu sesión expiró. Vuelve a entrar e inténtalo de nuevo.";

const MENSAJE_RED_PRODUCTOS =
  "No pudimos conectar con el catálogo. Revisa tu conexión e inténtalo de nuevo.";

const MENSAJE_GUARDAR =
  "No pudimos guardar el producto. Inténtalo de nuevo en unos minutos.";

const MENSAJE_SIN_SLUG =
  "El nombre necesita letras o números para crear la dirección de la ficha.";

const MENSAJE_DUPLICADO =
  "Ya existe un producto con ese nombre — prueba otro nombre.";

const MENSAJE_CHECK =
  "Algún dato no pasa la validación del catálogo (revisa categoría, precio o descripción).";

const MENSAJE_FOTO_FORMATO = "La foto debe ser JPG, PNG, WebP o SVG.";

const MENSAJE_FOTO_PESO = "La foto es muy pesada — prueba otra.";

const MENSAJE_SUBIR_FOTO =
  "No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.";

const MENSAJE_NO_EXISTE =
  "Ese producto ya no existe en el catálogo. Vuelve al panel y recarga la lista.";

const MENSAJE_STATUS =
  "El estado del producto solo puede ser publicado o retirado.";

/** Campos que tipea el dueño (los mismos del formulario compartido). */
export interface ProductFieldsInput {
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  /** null = "consulta el precio por WhatsApp"; entero ≥ 0 si hay precio. */
  price: number | null;
  featured: boolean;
}

/** Crear: la foto es obligatoria (flujo: elegir foto → guardar). */
export interface CreateProductInput extends ProductFieldsInput {
  /** Foto ya comprimida en el navegador (lib/image-upload.ts). */
  imageFile: File;
}

/** Editar: sin imageFile se conserva la foto actual. */
export interface UpdateProductInput extends ProductFieldsInput {
  id: string;
  /** "published" | "retired" (retirar es reversible, nunca borra). */
  status: string;
  /** Foto nueva ya comprimida, o null para conservar la actual. */
  imageFile: File | null;
}

/** Única forma de retorno de las mutations: el error para mostrar. */
export interface ProductActionError {
  error: string;
}

/** Traduce un error de Postgres a un mensaje accionable en español. */
function traducirErrorDb(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    // unique_violation: la carrera de dos creates con el mismo slug.
    return MENSAJE_DUPLICADO;
  }
  if (error.code === "23514") {
    // check_violation: categoría/precio/status fuera de los CHECK de la tabla.
    return MENSAJE_CHECK;
  }
  return MENSAJE_GUARDAR;
}

/**
 * Invalida la lectura pública del catálogo y marca las rutas afectadas
 * para regenerar (ISR bajo demanda): el cambio se ve en el sitio al
 * refrescar, SIN deploy.
 *
 * El orden importa: la memoización de lib/products.ts (TTL 60 s) se
 * tumba PRIMERO, porque la regeneración de abajo pasa por esa capa y
 * sin esto podría servirse la copia vieja.
 *
 * /sitemap.xml es una limitación conocida: revalidatePath no regenera
 * el sitemap, así que una ficha NUEVA tarda en aparecer ahí hasta el
 * próximo deploy (documentado en el README; Google la descubre igual por
 * los enlaces internos del catálogo). Se deja el intento best-effort.
 */
function invalidarYRevalidar(slug: string): void {
  invalidateCatalogCache();
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/sitemap.xml");
}

/**
 * Crea un producto: slug y posición se calculan ACÁ (el dueño jamás los
 * toca), la foto ya viene comprimida del navegador y sube al bucket con
 * el cliente autenticado del servidor.
 *
 * Orden de operaciones a propósito:
 * 1. validar campos (zod, los mismos gates del catálogo),
 * 2. validar la foto (mime y tamaño: nunca se confía en el cliente),
 * 3. verificación de colisión de slug,
 * 4. subir la foto nueva,
 * 5. INSERT de la fila,
 * 6. si el INSERT falla → borrar la foto recién subida (sin huérfanos).
 */
export async function createProductAction(
  input: CreateProductInput,
): Promise<ProductActionError | undefined> {
  if ((await getAuthenticatedUser()) === null) {
    return { error: MENSAJE_NO_SESION };
  }
  const config = getSupabaseAuthConfig();
  if (config === null) {
    return { error: MENSAJE_NO_CONFIGURADO };
  }

  // El slug nace del nombre (mismo slugify que muestra el preview en
  // vivo del formulario: lo que ve el dueño es lo que se guarda).
  const slug = slugify(input.name);
  if (slug === "") {
    return { error: MENSAJE_SIN_SLUG };
  }

  const campos = adminProductFieldsSchema.safeParse({ ...input, slug });
  if (!campos.success) {
    return { error: campos.error.issues[0]?.message ?? MENSAJE_GUARDAR };
  }

  // La foto se valida ANTES de tocar la red (nunca se confía en el
  // cliente: mime y tamaño se vuelven a chequear acá).
  if (!isAllowedImageMime(input.imageFile.type)) {
    return { error: MENSAJE_FOTO_FORMATO };
  }
  if (input.imageFile.size > MAX_IMAGE_BYTES) {
    return { error: MENSAJE_FOTO_PESO };
  }
  const extension = extensionFromMime(input.imageFile.type);
  if (extension === null) {
    return { error: MENSAJE_FOTO_FORMATO };
  }

  let fallo: string | null = null;
  try {
    if (await slugExists(slug)) {
      fallo = MENSAJE_DUPLICADO;
    } else {
      const supabase = await createSupabaseAuthClient();

      // Nombre versionado por timestamp: URL nueva = caché rota del CDN,
      // y sin colisiones con fotos anteriores del mismo producto.
      const fileName = buildStorageFileName(slug, Date.now(), extension);
      const { error: uploadError } = await supabase.storage
        .from(PRODUCTS_BUCKET)
        .upload(fileName, input.imageFile, {
          contentType: input.imageFile.type,
          upsert: false,
        });
      if (uploadError !== null) {
        fallo = MENSAJE_SUBIR_FOTO;
      } else {
        const imageUrl = buildPublicStorageUrl(config.url, fileName);

        // Gate final con el schema completo (campos + imagen + estado).
        const final = adminProductSchema.safeParse({
          ...campos.data,
          image: imageUrl,
          status: "published",
        });
        if (!final.success) {
          await borrarObjetoBestEffort(supabase, fileName);
          fallo = final.error.issues[0]?.message ?? MENSAJE_GUARDAR;
        } else {
          // position automática: MAX(position)+1 (columna sin default).
          const position = await getNextPosition();
          const { error: insertError } = await supabase.from("products").insert({
            slug: final.data.slug,
            name: final.data.name,
            short_description: final.data.shortDescription,
            description: final.data.description,
            category: final.data.category,
            price: final.data.price,
            image: final.data.image,
            featured: final.data.featured,
            status: final.data.status,
            position,
          });
          if (insertError !== null) {
            // La fila no se creó: no dejar la foto huérfana en el bucket.
            await borrarObjetoBestEffort(supabase, fileName);
            fallo = traducirErrorDb(insertError);
          }
        }
      }
    }
  } catch {
    fallo = MENSAJE_RED_PRODUCTOS;
  }

  if (fallo !== null) {
    return { error: fallo };
  }

  invalidarYRevalidar(slug);
  redirect("/admin?ok=creado");
}

/**
 * Guarda los cambios de un producto existente: campos editables, estado
 * (publicar/retirar — retirar JAMÁS borra) y reemplazo de foto.
 *
 * Reemplazo de foto, en orden:
 * 1. subir la nueva (nombre con timestamp → URL distinta → el CDN y el
 *    navegador descargan la nueva, no la vieja en caché),
 * 2. UPDATE de la fila apuntando a la URL nueva,
 * 3. borrar del bucket el objeto anterior — SOLO si la imagen anterior
 *    era de NUESTRO bucket (extractStorageFileName): una ruta local del
 *    repo o una URL externa no se toca.
 * Si el UPDATE falla, la foto nueva se borra para no dejar huérfanos.
 */
export async function updateProductAction(
  input: UpdateProductInput,
): Promise<ProductActionError | undefined> {
  if ((await getAuthenticatedUser()) === null) {
    return { error: MENSAJE_NO_SESION };
  }
  const config = getSupabaseAuthConfig();
  if (config === null) {
    return { error: MENSAJE_NO_CONFIGURADO };
  }

  if (input.status !== "published" && input.status !== "retired") {
    return { error: MENSAJE_STATUS };
  }
  const status: ProductStatus = input.status;

  let fallo: string | null = null;
  let slugParaRevalidar: string | null = null;
  let okDestino = "guardado";

  try {
    const actual: AdminProduct | null = await getAdminProductById(input.id);
    if (actual === null) {
      fallo = MENSAJE_NO_EXISTE;
    } else {
      // El slug no se toca (cambiarlo rompería URLs indexadas): se valida
      // la fila contra el slug que YA tiene.
      const campos = adminProductFieldsSchema.safeParse({
        ...input,
        slug: actual.slug,
      });
      if (!campos.success) {
        fallo = campos.error.issues[0]?.message ?? MENSAJE_GUARDAR;
      } else {
        const supabase = await createSupabaseAuthClient();

        let imageUrl = actual.image;
        let archivoNuevo: string | null = null;

        if (input.imageFile !== null) {
          if (!isAllowedImageMime(input.imageFile.type)) {
            return { error: MENSAJE_FOTO_FORMATO };
          }
          if (input.imageFile.size > MAX_IMAGE_BYTES) {
            return { error: MENSAJE_FOTO_PESO };
          }
          const extension = extensionFromMime(input.imageFile.type);
          if (extension === null) {
            return { error: MENSAJE_FOTO_FORMATO };
          }
          archivoNuevo = buildStorageFileName(actual.slug, Date.now(), extension);
          const { error: uploadError } = await supabase.storage
            .from(PRODUCTS_BUCKET)
            .upload(archivoNuevo, input.imageFile, {
              contentType: input.imageFile.type,
              upsert: false,
            });
          if (uploadError !== null) {
            fallo = MENSAJE_SUBIR_FOTO;
            archivoNuevo = null;
          } else {
            imageUrl = buildPublicStorageUrl(config.url, archivoNuevo);
          }
        }

        if (fallo === null) {
          const final = adminProductSchema.safeParse({
            ...campos.data,
            image: imageUrl,
            status,
          });
          if (!final.success) {
            if (archivoNuevo !== null) {
              await borrarObjetoBestEffort(supabase, archivoNuevo);
            }
            fallo = final.error.issues[0]?.message ?? MENSAJE_GUARDAR;
          } else {
            const { error: updateError } = await supabase
              .from("products")
              .update({
                name: final.data.name,
                short_description: final.data.shortDescription,
                description: final.data.description,
                category: final.data.category,
                price: final.data.price,
                image: final.data.image,
                featured: final.data.featured,
                status: final.data.status,
                // position tampoco se toca en edición (se asigna al crear).
                // La tabla no tiene trigger de UPDATE: la app escribe la
                // fecha de edición (la lista del panel la usa para
                // orden=editados).
                updated_at: new Date().toISOString(),
              })
              .eq("id", actual.id);
            if (updateError !== null) {
              if (archivoNuevo !== null) {
                await borrarObjetoBestEffort(supabase, archivoNuevo);
              }
              fallo = traducirErrorDb(updateError);
            } else {
              if (archivoNuevo !== null) {
                // La fila ya apunta a la foto nueva: a limpiar la vieja,
                // pero SOLO si vivía en NUESTRO bucket.
                const archivoViejo = extractStorageFileName(
                  actual.image,
                  config.url,
                );
                if (archivoViejo !== null && archivoViejo !== archivoNuevo) {
                  await borrarObjetoBestEffort(supabase, archivoViejo);
                }
              }
              slugParaRevalidar = actual.slug;
              // Feedback diferenciado si lo que cambió fue el estado.
              okDestino =
                status === "retired" && actual.status === "published"
                  ? "retirado"
                  : status === "published" && actual.status === "retired"
                    ? "publicado"
                    : "guardado";
            }
          }
        }
      }
    }
  } catch {
    fallo = MENSAJE_RED_PRODUCTOS;
  }

  if (fallo !== null) {
    return { error: fallo };
  }
  if (slugParaRevalidar === null) {
    // Inalcanzable por construcción (solo se setea en la rama de éxito),
    // pero defensivo: nunca redirigir como si hubiera ido bien.
    return { error: MENSAJE_GUARDAR };
  }

  invalidarYRevalidar(slugParaRevalidar);
  redirect(`/admin?ok=${okDestino}`);
}

/** Borra un objeto del bucket sin que un fallo cosmético tumbe el flujo. */
async function borrarObjetoBestEffort(
  supabase: Awaited<ReturnType<typeof createSupabaseAuthClient>>,
  fileName: string,
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .remove([fileName]);
    if (error !== null) {
      console.warn(
        `[panel] no se pudo borrar "${fileName}" del bucket (${error.message}); quedó huérfano, no rompe nada.`,
      );
    }
  } catch (error: unknown) {
    console.warn(
      `[panel] no se pudo borrar "${fileName}" del bucket (${error instanceof Error ? error.message : "sin detalle"}); quedó huérfano, no rompe nada.`,
    );
  }
}
