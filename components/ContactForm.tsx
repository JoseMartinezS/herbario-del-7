"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BUSINESS } from "@/content/business";
import { IconWhatsApp } from "./icons";

/**
 * Formulario de contacto sin backend: arma un mensaje y lo abre en WhatsApp
 * (wa.me) con el texto listo para enviar. Validación con zod + react-hook-form.
 */

const contactSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre (al menos 2 letras).")
    .max(80, "Máximo 80 caracteres."),
  telefono: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^[0-9]{10,15}$/.test(value), {
      message: "Ingresa entre 10 y 15 dígitos, sin espacios ni guiones.",
    }),
  mensaje: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más (al menos 10 caracteres).")
    .max(500, "Máximo 500 caracteres."),
});

type ContactFormValues = z.infer<typeof contactSchema>;

function fieldClass(hasError: boolean): string {
  return `w-full rounded-md border bg-white px-3.5 py-2.5 text-base text-green-900 placeholder:text-green-800/40 transition-colors focus:border-green-600 ${
    hasError ? "border-terracotta-600" : "border-sand"
  }`;
}

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { nombre: "", telefono: "", mensaje: "" },
  });

  function onSubmit(values: ContactFormValues): void {
    const telefono =
      values.telefono.length > 0 ? ` Mi teléfono: ${values.telefono}.` : "";
    const texto = `Hola, soy ${values.nombre}. ${values.mensaje}${telefono}`;
    window.open(
      `${BUSINESS.whatsapp.url}?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener",
    );
    setSent(true);
    reset();
  }

  if (sent) {
    return (
      <div
        role="status"
        className="rounded-xl border border-green-200 bg-green-50 p-6"
      >
        <p className="font-display text-lg font-semibold text-green-800">
          Listo: tu mensaje se abrió en WhatsApp.
        </p>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-green-800/75">
          Solo presiona enviar en WhatsApp para que nos llegue. Si no se abrió,
          escríbenos directamente al{" "}
          <a
            href={BUSINESS.whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-green-800 underline underline-offset-4"
          >
            {BUSINESS.whatsapp.display}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 text-sm font-semibold text-terracotta-700 underline underline-offset-4 transition-colors hover:text-terracotta-800"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="nombre"
          className="text-sm font-semibold text-green-800"
        >
          Nombre
        </label>
        <input
          id="nombre"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          {...register("nombre")}
          aria-invalid={errors.nombre ? true : undefined}
          aria-describedby={errors.nombre ? "nombre-error" : undefined}
          className={fieldClass(Boolean(errors.nombre))}
        />
        {errors.nombre ? (
          <p id="nombre-error" role="alert" className="text-sm text-terracotta-800">
            {errors.nombre.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="telefono"
          className="text-sm font-semibold text-green-800"
        >
          Teléfono{" "}
          <span className="font-normal text-green-800/60">(opcional)</span>
        </label>
        <input
          id="telefono"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10 a 15 dígitos"
          {...register("telefono")}
          aria-invalid={errors.telefono ? true : undefined}
          aria-describedby={errors.telefono ? "telefono-error" : undefined}
          className={fieldClass(Boolean(errors.telefono))}
        />
        {errors.telefono ? (
          <p id="telefono-error" role="alert" className="text-sm text-terracotta-800">
            {errors.telefono.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="mensaje"
          className="text-sm font-semibold text-green-800"
        >
          Mensaje
        </label>
        <textarea
          id="mensaje"
          rows={5}
          placeholder="Cuéntanos qué buscas o en qué te podemos orientar."
          {...register("mensaje")}
          aria-invalid={errors.mensaje ? true : undefined}
          aria-describedby={errors.mensaje ? "mensaje-error" : undefined}
          className={`${fieldClass(Boolean(errors.mensaje))} resize-y`}
        />
        {errors.mensaje ? (
          <p id="mensaje-error" role="alert" className="text-sm text-terracotta-800">
            {errors.mensaje.message}
          </p>
        ) : null}
      </div>

      <p
        id="nota-whatsapp"
        className="flex items-start gap-2.5 rounded-md bg-cream-dark/70 px-4 py-3 text-sm leading-relaxed text-green-800/75"
      >
        <IconWhatsApp className="mt-0.5 h-4.5 w-4.5 shrink-0 text-green-700" />
        Al enviar, se abre WhatsApp con tu mensaje listo para enviar.
      </p>

      <button
        type="submit"
        aria-describedby="nota-whatsapp"
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-whatsapp-deep px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-whatsapp-deep-hover sm:w-auto"
      >
        <IconWhatsApp className="h-5 w-5" />
        Enviar por WhatsApp
      </button>
    </form>
  );
}
