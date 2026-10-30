import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Página placeholder: el panel de administración del catálogo llegará en una
// fase futura del proyecto. Sin funcionalidad por ahora.
const PLAN = [
  "Crear, editar y retirar productos del catálogo, con foto, precio y categoría.",
  "Marcar productos como destacados para la página de inicio.",
  "Acceso protegido, solo para el personal del herbolario.",
] as const;

export default function AdminPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="rounded-2xl border-2 border-gold-600/60 p-1.5">
        <div className="rounded-xl p-6 ring-1 ring-inset ring-gold-600/40 sm:p-10">
          <p className="inline-flex items-center rounded-full border border-gold-200 bg-gold-100 px-3 py-1 text-sm font-medium text-gold-800">
            En preparación
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-balance text-green-800 sm:text-4xl">
            Panel de administración
          </h1>
          <p className="mt-4 max-w-prose text-pretty text-base leading-relaxed text-green-800/80">
            El panel para gestionar el catálogo del herbolario llegará en una fase
            futura del sitio. Esto es lo que estamos planeando:
          </p>
          <ul className="mt-6 flex max-w-prose flex-col gap-3">
            {PLAN.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-pretty text-base leading-relaxed text-green-800/85"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold-500"
                />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-prose text-sm leading-relaxed text-green-800/65">
            Mientras tanto, el catálogo se actualiza de forma manual y esta
            página no afecta la tienda pública.
          </p>
        </div>
      </div>
    </section>
  );
}
