"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminImageInput from "@/components/AdminImageInput";
import { createProductAction, updateProductAction } from "@/app/admin/actions";
import { MAX_PRICE } from "@/lib/admin-schema";
import { slugify } from "@/lib/slugify";
import { CATEGORIES, CATEGORY_INFO } from "@/lib/types";
import type { AdminProduct } from "@/lib/admin-products";

/**
 * Formulario de producto del panel (F2.3): UN componente para crear y
 * editar (mismo formulario, dos modos).
 *
 * Patrón del AdminLoginForm de F2.2: react-hook-form + zod en el cliente
 * para los mensajes inmediatos, y la Server Action revalida TODO en el
 * servidor con los mismos gates (nunca se confía en el cliente). El
 * error del servidor (colisión de nombre, red, etc.) se muestra inline
 * con el foco movido al mensaje.
 *
 * Lo que el dueño NO toca, a propósito:
 * - slug: se arma en vivo desde el nombre (preview debajo del campo) y
 *   lo genera el servidor al crear; en edición ni aparece como campo
 *   (cambiarlo rompería URLs ya indexadas),
 * - position: la calcula la action al crear (MAX+1); en edición es
 *   información de lectura,
 * - status en creación: todo producto nace publicado (retirar es un
 *   paso posterior, reversible).
 *
 * La foto se elige y comprime acá (AdminImageInput + canvas) y viaja a
 * la action como archivo ya liviano.
 */

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  shortDescription: z
    .string()
    .min(1, "La descripción corta es obligatoria.")
    .max(140, "La descripción corta no debe pasar de 140 caracteres."),
  description: z
    .string()
    .min(1, "La descripción es obligatoria.")
    .refine(
      (value) => value.includes("\n\n"),
      "Escribe dos párrafos separados por una línea en blanco.",
    ),
  category: z.string().refine(
    (value) => (CATEGORIES as readonly string[]).includes(value),
    "Elige una familia del mostrador.",
  ),
  price: z
    .string()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "El precio debe ser un número entero de pesos (sin centavos).",
    )
    .refine(
      (value) => value === "" || Number(value) <= MAX_PRICE,
      "El precio máximo es $99,999,999.",
    ),
  featured: z.boolean(),
  status: z.enum(["published", "retired"]),
});

type FormValues = z.infer<typeof formSchema>;

type AdminProductFormProps =
  | { mode: "create" }
  | { mode: "edit"; product: AdminProduct };

function fieldClass(hasError: boolean): string {
  return `w-full rounded-md border bg-white px-3.5 py-2.5 text-base text-green-900 placeholder:text-green-800/40 transition-colors focus:border-green-600 ${
    hasError ? "border-terracotta-600" : "border-sand"
  }`;
}

/** Marco común de los bloques de solo-lectura (slug, posición). */
function infoClass(): string {
  return "rounded-xl bg-cream-dark/60 px-4 py-3.5 text-sm leading-relaxed text-green-800/75";
}

export default function AdminProductForm(props: AdminProductFormProps) {
  const isEdit = props.mode === "edit";
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          name: props.product.name,
          shortDescription: props.product.shortDescription,
          description: props.product.description,
          category: props.product.category,
          price: props.product.price === null ? "" : String(props.product.price),
          featured: props.product.featured,
          status: props.product.status,
        }
      : {
          name: "",
          shortDescription: "",
          description: "",
          category: "",
          price: "",
          featured: false,
          status: "published",
        },
  });

  // Al aparecer un error del server, mover el foco al mensaje (lectores
  // de pantalla lo anuncian; la persona ve qué pasó al instante).
  useEffect(() => {
    if (serverError !== null) {
      errorRef.current?.focus();
    }
  }, [serverError]);

  const nameValue = watch("name");
  const shortDescriptionLength = watch("shortDescription").length;
  const slugPreview = slugify(nameValue);

  function handleFileChange(file: File | null): void {
    setImageFile(file);
    if (file !== null) {
      setImageError(null);
    }
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setServerError(null);

    // Confirmación leve al retirar: es reversible, pero que no sea por
    // accidente un tap en el celular.
    if (
      isEdit &&
      values.status === "retired" &&
      props.product.status === "published" &&
      !window.confirm(
        "¿Retirar del catálogo? Podrás volver a publicarlo cuando quieras.",
      )
    ) {
      return;
    }

    const campos = {
      name: values.name,
      shortDescription: values.shortDescription,
      description: values.description,
      category: values.category,
      price: values.price === "" ? null : Number(values.price),
      featured: values.featured,
    };

    let resultado: { error: string } | undefined;
    if (isEdit) {
      resultado = await updateProductAction({
        ...campos,
        id: props.product.id,
        status: values.status,
        imageFile,
      });
    } else {
      // La foto es obligatoria para CREAR (para editar, sin cambio se
      // conserva la actual).
      if (imageFile === null) {
        setImageError("La foto es obligatoria.");
        return;
      }
      resultado = await createProductAction({
        ...campos,
        imageFile,
      });
    }
    if (resultado !== undefined) {
      setServerError(resultado.error);
    }
    // Sin error, la action redirige al panel y esta página se desmonta.
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <AdminImageInput
        currentImage={isEdit ? props.product.image : undefined}
        productName={isEdit ? props.product.name : nameValue}
        required={!isEdit}
        file={imageFile}
        onFileChange={handleFileChange}
        error={imageError}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold text-green-800">
          Nombre
        </label>
        <input
          id="name"
          type="text"
          autoComplete="off"
          placeholder="p. ej. Veladoras de Parafina"
          {...register("name")}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={fieldClass(Boolean(errors.name))}
        />
        {errors.name ? (
          <p id="name-error" role="alert" className="text-sm text-terracotta-800">
            {errors.name.message}
          </p>
        ) : null}
        {!isEdit ? (
          <p className="text-sm leading-relaxed text-green-800/70">
            {slugPreview !== "" ? (
              <>
                Se publicará en{" "}
                <span className="font-medium text-green-800" translate="no">
                  /catalogo/{slugPreview}
                </span>
              </>
            ) : (
              "La dirección de la ficha se arma sola a partir del nombre."
            )}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="category"
          className="text-sm font-semibold text-green-800"
        >
          Familia
        </label>
        <select
          id="category"
          {...register("category")}
          aria-invalid={errors.category ? true : undefined}
          aria-describedby={errors.category ? "category-error" : undefined}
          className={fieldClass(Boolean(errors.category))}
        >
          <option value="" disabled>
            Elige una familia…
          </option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_INFO[category].name}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p
            id="category-error"
            role="alert"
            className="text-sm text-terracotta-800"
          >
            {errors.category.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="price" className="text-sm font-semibold text-green-800">
          Precio (pesos MXN)
        </label>
        <input
          id="price"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="60"
          {...register("price")}
          aria-invalid={errors.price ? true : undefined}
          aria-describedby={
            errors.price ? "price-error" : "price-hint"
          }
          className={fieldClass(Boolean(errors.price))}
        />
        {errors.price ? (
          <p
            id="price-error"
            role="alert"
            className="text-sm text-terracotta-800"
          >
            {errors.price.message}
          </p>
        ) : (
          <p id="price-hint" className="text-xs leading-relaxed text-green-800/65">
            Número entero, sin centavos. Déjalo vacío para mostrar «Consulta el
            precio por WhatsApp».
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="shortDescription"
          className="text-sm font-semibold text-green-800"
        >
          Descripción corta
        </label>
        <textarea
          id="shortDescription"
          rows={2}
          placeholder="Una línea para la tarjeta del catálogo."
          {...register("shortDescription")}
          aria-invalid={errors.shortDescription ? true : undefined}
          aria-describedby={
            errors.shortDescription
              ? "shortDescription-error"
              : "shortDescription-counter"
          }
          className={`${fieldClass(Boolean(errors.shortDescription))} resize-y`}
        />
        {errors.shortDescription ? (
          <p
            id="shortDescription-error"
            role="alert"
            className="text-sm text-terracotta-800"
          >
            {errors.shortDescription.message}
          </p>
        ) : null}
        <p
          id="shortDescription-counter"
          aria-hidden="true"
          className={`self-end text-xs font-medium ${
            shortDescriptionLength > 140
              ? "text-terracotta-800"
              : "text-green-800/60"
          }`}
        >
          {shortDescriptionLength}/140
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="description"
          className="text-sm font-semibold text-green-800"
        >
          Descripción
        </label>
        <textarea
          id="description"
          rows={6}
          placeholder={"Qué es, para qué se usa, cómo se presenta.\n\nUna línea en blanco y un segundo párrafo de cierre."}
          {...register("description")}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? "description-error" : "description-hint"
          }
          className={`${fieldClass(Boolean(errors.description))} resize-y`}
        />
        {errors.description ? (
          <p
            id="description-error"
            role="alert"
            className="text-sm text-terracotta-800"
          >
            {errors.description.message}
          </p>
        ) : (
          <p
            id="description-hint"
            className="text-xs leading-relaxed text-green-800/65"
          >
            Dos párrafos cortos, separados por una línea en blanco (así se
            muestra en la ficha).
          </p>
        )}
      </div>

      <label
        htmlFor="featured"
        className="flex items-center justify-between gap-4 rounded-xl border border-sand bg-white px-4 py-3.5"
      >
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-green-800">
            Destacar en el inicio
          </span>
          <span className="text-xs leading-relaxed text-green-800/65">
            Aparece en «Los más pedidos de la casa» de la portada.
          </span>
        </span>
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
          <input
            id="featured"
            type="checkbox"
            className="peer sr-only"
            {...register("featured")}
          />
          <span className="absolute inset-0 rounded-full border border-sand bg-cream-dark transition-colors peer-checked:border-green-600 peer-checked:bg-green-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta-600" />
          <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>

      {isEdit ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-green-800">
            Estado en el catálogo
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
            <label className="cursor-pointer">
              <input
                type="radio"
                value="published"
                className="peer sr-only"
                {...register("status")}
              />
              <span className="flex items-center justify-center rounded-full border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-green-800 transition-colors peer-checked:border-green-600 peer-checked:bg-green-600 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta-600">
                Publicado
              </span>
            </label>
            <label className="cursor-pointer">
              <input
                type="radio"
                value="retired"
                className="peer sr-only"
                {...register("status")}
              />
              <span className="flex items-center justify-center rounded-full border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-green-800 transition-colors peer-checked:border-terracotta-600 peer-checked:bg-terracotta-600 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta-600">
                Retirado
              </span>
            </label>
          </div>
          <p className="text-xs leading-relaxed text-green-800/65">
            Retirar lo esconde del catálogo público sin borrar la ficha: puedes
            volver a publicarlo cuando quieras. Nada se borra.
          </p>
        </fieldset>
      ) : null}

      {isEdit ? (
        <div className={infoClass()}>
          <p>
            Dirección de la ficha:{" "}
            <span className="font-medium text-green-800" translate="no">
              /catalogo/{props.product.slug}
            </span>{" "}
            — no se puede cambiar (ya está indexada en buscadores).
          </p>
          <p className="mt-1">
            Posición en el catálogo: {props.product.position} (se asigna sola al
            crear; el orden se hereda del catálogo).
          </p>
        </div>
      ) : null}

      {serverError !== null ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-terracotta-300 bg-terracotta-50 px-4 py-3 text-pretty text-sm leading-relaxed text-terracotta-900"
        >
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-terracotta-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
                className="h-5 w-5 motion-safe:animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
              >
                <path d="M12 3a9 9 0 1 0 9 9" />
              </svg>
              Guardando…
            </>
          ) : isEdit ? (
            "Guardar cambios"
          ) : (
            "Publicar producto"
          )}
        </button>
        <Link
          href="/admin"
          className="inline-flex w-full items-center justify-center rounded-full border border-green-300 bg-transparent px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50 sm:w-auto"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
