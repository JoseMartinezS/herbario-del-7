"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginAction } from "@/app/admin/actions";

/**
 * Formulario de entrada al panel admin (F2.2).
 *
 * Cliente mínimo: valida con zod + react-hook-form (mismo patrón que el
 * ContactForm) y delega la autenticación a la Server Action `loginAction`.
 * La contraseña se manda directo al servidor — nunca se toca en el
 * cliente más allá del input — y la cookie de sesión la escribe el SDK
 * desde el server (httpOnly).
 *
 * En éxito la acción redirige y esta página se desmonta; si vuelve con
 * { error }, se muestra en español, sin jerga, con el foco movido al
 * mensaje para que un lector de pantalla lo anuncie.
 */

const loginSchema = z.object({
  email: z.email("Ingresa un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function fieldClass(hasError: boolean): string {
  return `w-full rounded-md border bg-white px-3.5 py-2.5 text-base text-green-900 placeholder:text-green-800/40 transition-colors focus:border-green-600 ${
    hasError ? "border-terracotta-600" : "border-sand"
  }`;
}

export default function AdminLoginForm({
  nextPath,
}: {
  /** Destino post-login (ya saneado por la página; se re-sanéa en el server). */
  nextPath: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Al aparecer un error del server, mover el foco al mensaje: los lectores
  // de pantalla lo anuncian y la persona ve de inmediato qué pasó.
  useEffect(() => {
    if (serverError !== null) {
      errorRef.current?.focus();
    }
  }, [serverError]);

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setServerError(null);
    const resultado = await loginAction({
      email: values.email,
      password: values.password,
      nextPath,
    });
    if (resultado) {
      setServerError(resultado.error);
    }
    // Sin error, la Server Action redirige y esta página se desmonta sola.
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-semibold text-green-800"
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="nombre@correo.com"
          {...register("email")}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={fieldClass(Boolean(errors.email))}
        />
        {errors.email ? (
          <p
            id="email-error"
            role="alert"
            className="text-sm text-terracotta-800"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-green-800"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          className={fieldClass(Boolean(errors.password))}
        />
        {errors.password ? (
          <p
            id="password-error"
            role="alert"
            className="text-sm text-terracotta-800"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>

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

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-terracotta-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:opacity-70"
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
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </button>
    </form>
  );
}
