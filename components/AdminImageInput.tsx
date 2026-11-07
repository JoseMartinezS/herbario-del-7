"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { IconCamera } from "@/components/icons";
import {
  formatFileSize,
  prepareImageForUpload,
} from "@/lib/image-upload";
import { isAllowedImageMime } from "@/lib/storage";

/**
 * La sección de foto del formulario de producto (F2.3).
 *
 * Flujo al elegir archivo: validación de mime al toque → compresión en
 * canvas (máx. 1200 px, WebP ~0.8 — ver lib/image-upload.ts) → preview
 * con la foto final y su peso real. El archivo preparado (no el original
 * de 8 MB del teléfono) es el que viaja a la Server Action.
 *
 * El input nativo de archivo es la puerta: en el celular abre la galería
 * o la cámara, con teclado cero. SVG pasa sin recomprimir.
 *
 * El estado del ARCHIVO lo maneja el formulario padre (onFileChange);
 * acá viven el preview, el estado "preparando…" y los errores de la
 * elección misma.
 */

interface AdminImageInputProps {
  /** URL/ruta de la foto actual (modo edición; undefined en creación). */
  currentImage?: string;
  /** Nombre del producto, para el alt de la foto actual. */
  productName: string;
  /** Creación: sin foto no se puede guardar (el aviso lo pone el padre). */
  required: boolean;
  /** Foto ya preparada (comprimida) elegida por el dueño. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Error de validación del padre (p. ej. "La foto es obligatoria."). */
  error?: string | null;
}

const ACCEPT_ATTR =
  "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg";

export default function AdminImageInput({
  currentImage,
  productName,
  required,
  file,
  onFileChange,
  error,
}: AdminImageInputProps) {
  const [preparando, setPreparando] = useState(false);
  const [errorLocal, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // El objectURL del preview se revoca al cambiar/desmontar (el blob del
  // archivo lo retiene React en el estado, no la URL).
  useEffect(() => {
    if (file === null) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onChooseFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const chosen = event.target.files?.[0] ?? null;
    // Resetear el value: elegir el MISMO archivo dos veces debe volver a
    // disparar change (p. ej. corregir una foto rechazada).
    event.target.value = "";
    if (chosen === null) {
      return;
    }
    if (!isAllowedImageMime(chosen.type)) {
      setLocalError("La foto debe ser JPG, PNG, WebP o SVG.");
      onFileChange(null);
      return;
    }
    setLocalError(null);
    setPreparando(true);
    try {
      const preparada = await prepareImageForUpload(chosen);
      onFileChange(preparada);
    } catch (error) {
      onFileChange(null);
      setLocalError(
        error instanceof Error
          ? error.message
          : "No pudimos preparar la foto. Prueba con otra.",
      );
    } finally {
      setPreparando(false);
    }
  }

  const mensajeError = errorLocal ?? error ?? null;
  const inputId = "foto-producto";

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-green-800"
      >
        Foto del producto{required ? "" : " (opcional)"}
      </label>

      <div className="flex items-start gap-4">
        {/* Preview: la foto elegida (blob local) o la actual de la ficha. */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-sand bg-cream-dark">
          {previewUrl !== null ? (
            // URL blob local: no pasa por el optimizador de next/image
            // (no es un path remoto configurado); <img> directo.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : currentImage !== undefined ? (
            <Image
              src={currentImage}
              alt={productName}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <IconCamera className="h-8 w-8 text-green-300" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            htmlFor={inputId}
            className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-full border border-green-300 bg-transparent px-4 py-2 text-sm font-semibold text-green-800 transition-colors hover:border-green-400 hover:bg-green-50"
          >
            <IconCamera className="h-4 w-4" />
            {file !== null || currentImage !== undefined
              ? "Cambiar la foto"
              : "Elegir foto"}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={onChooseFile}
            disabled={preparando}
            aria-invalid={mensajeError !== null}
            aria-describedby={mensajeError !== null ? `${inputId}-error` : undefined}
            className="sr-only"
          />
          <p className="text-xs leading-relaxed text-green-800/65">
            JPG, PNG, WebP o SVG. Se comprime sola para que el sitio cargue
            rápido.
          </p>
          {preparando ? (
            <p className="text-sm font-medium text-green-700" role="status">
              Preparando la foto…
            </p>
          ) : file !== null ? (
            <p className="text-sm font-medium text-green-700" role="status">
              Foto lista ({formatFileSize(file.size)})
              {file.type === "image/svg+xml" ? " · SVG sin comprimir" : ""}
            </p>
          ) : null}
          {file === null && currentImage !== undefined ? (
            <p className="text-xs leading-relaxed text-green-800/65">
              Si no la cambias, se conserva la actual.
            </p>
          ) : null}
        </div>
      </div>

      {mensajeError !== null ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-sm text-terracotta-800"
        >
          {mensajeError}
        </p>
      ) : null}
    </div>
  );
}
