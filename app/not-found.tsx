import type { Metadata } from "next";
import Link from "next/link";
import SprigDivider from "@/components/SprigDivider";

// Título propio para la 404; sin esto heredaría el título por defecto del
// layout ("Herbario Del 7 | Herbolaria...") y no indicaría nada útil.
export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
      <SprigDivider className="mx-auto mb-10 w-44" />
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-green-800 sm:text-4xl">
        Esta página se perdió entre las hierbas
      </h1>
      <p className="mx-auto mt-4 max-w-prose text-pretty text-base leading-relaxed text-green-800/75">
        Puede que el enlace haya cambiado o que la página ya no exista. Te
        dejamos dos caminos para volver.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-green-700 px-6 py-3.5 text-base font-semibold text-cream shadow-md transition-colors hover:bg-green-800"
        >
          Volver al inicio
        </Link>
        <Link
          href="/catalogo"
          className="inline-flex items-center justify-center rounded-full border-2 border-green-700 px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:bg-green-700 hover:text-cream"
        >
          Ver catálogo
        </Link>
      </div>
    </section>
  );
}
