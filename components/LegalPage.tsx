import type { ReactNode } from "react";
import SprigDivider from "./SprigDivider";

/**
 * Armazón compartida de las páginas legales (/privacidad, /terminos,
 * /cookies): encabezado con fecha de actualización, índice con anclas y
 * secciones numeradas dentro de una columna de lectura digna.
 *
 * Las secciones se declaran como datos (id + título + contenido JSX) para
 * que el índice y el cuerpo se generen de la misma lista: nunca divergen.
 */

/** Sección de documento legal: ancla, título y contenido. */
export interface LegalSectionData {
  /** Ancla del índice (#id); debe ser única en la página. */
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalPageProps {
  title: string;
  intro: string;
  /** Fecha de última actualización, lista para mostrar. */
  updated: string;
  sections: readonly LegalSectionData[];
}

/**
 * Tipografía del cuerpo legal: párrafos y listas heredan del contenedor
 * (`space-y-4` + color/base) y los elementos internos (h3, listas, links)
 * se estilizan con variantes arbitrarias, para que el contenido se escriba
 * como JSX limpio sin repetir clases en cada etiqueta.
 */
const BODY_CLASS =
  "space-y-4 text-pretty text-base leading-relaxed text-green-800/85 " +
  "[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-green-800 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 " +
  "[&_li]:marker:text-gold-600 " +
  "[&_a]:font-semibold [&_a]:text-terracotta-700 [&_a]:underline " +
  "[&_a]:decoration-gold-400 [&_a]:decoration-2 [&_a]:underline-offset-4 " +
  "[&_a]:transition-colors [&_a:hover]:text-terracotta-800 " +
  "[&_strong]:font-semibold [&_strong]:text-green-800";

export default function LegalPage({
  title,
  intro,
  updated,
  sections,
}: LegalPageProps) {
  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-green-800 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-green-800/80">
          {intro}
        </p>
        <p className="mt-3 text-sm font-medium text-green-800/60">
          Última actualización: {updated}
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <SprigDivider className="mb-10 w-44" />

        {/* Índice: nace de la misma lista que las secciones. */}
        <nav
          aria-label="Contenido de esta página"
          className="rounded-xl border border-sand bg-white/70 p-5 sm:p-6"
        >
          <h2 className="font-display text-lg font-semibold text-green-800">
            Contenido
          </h2>
          <ol className="mt-3 grid gap-x-10 gap-y-2 text-base sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id} className="flex gap-2.5">
                <span
                  aria-hidden="true"
                  className="font-medium text-gold-700"
                >
                  {index + 1}.
                </span>
                <a
                  href={`#${section.id}`}
                  className="font-medium text-green-800 underline-offset-4 transition-colors hover:text-green-700 hover:underline"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Cuerpo: columna de lectura, secciones con ancla y scroll-mt
            para que el header sticky no tape el título al saltar. */}
        <div className="mt-12 max-w-3xl space-y-12">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-balance text-green-800">
                <span aria-hidden="true" className="mr-3 text-gold-700">
                  {index + 1}.
                </span>
                {section.title}
              </h2>
              <div className={`mt-5 ${BODY_CLASS}`}>{section.content}</div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
