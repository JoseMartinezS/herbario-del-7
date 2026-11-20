import Link from "next/link";
import { SALTO_PAGINAS, calcularPaginas } from "@/lib/pagination";

/**
 * Nav de paginación compartido (server component, 0 JS): "Anterior" +
 * ventana de números + "Siguiente", todo `<Link>` a URLs que arma la
 * página vía `buildHref` — el estado vive en la URL, no hay JS que
 * sincronizar y sin JavaScript navega igual (Cmd/clic y clic medio
 * incluidos, por ser links de verdad).
 *
 * Con una sola página (o ninguna) devuelve null: media fila de
 * controles para una vista única es ruido, no navegación.
 *
 * Lenguaje visual: las mismas píldoras de los chips de filtros —
 * activa verde sólido (el "estás acá" de CategoryFilter y del panel),
 * inactiva quieta sobre crema que se enciende al dorado en hover. El
 * foco lo resuelve el outline terracota global de globals.css: nada
 * propio que ocultar ni inventar. Píldoras de 40 px de alto para el
 * dedo (el dueño navega desde el teléfono) y `touch-manipulation` para
 * matar el delay del doble tap.
 *
 * La página activa es un <span> con `aria-current="page"`, no un link
 * a sí misma: no navega a ningún lado y un span no roba foco. Los
 * bordes deshabilitados tampoco son links muertos — spans mudos con
 * `aria-disabled="true"`, que preservan el layout y anuncian el
 * estado.
 */

/** Base de cada control: píldora tocable de 40 px, transición solo de
 *  color (y apagada con prefers-reduced-motion). */
const PILDORA_BASE =
  "inline-flex h-10 touch-manipulation items-center justify-center rounded-full border text-sm transition-colors motion-reduce:transition-none";

/** Número de página: cuadrado generoso (40 px de ancho mínimo) con
 *  tabular-nums para que las cifras no bailen entre sí. */
const PILDORA_NUMERO = `${PILDORA_BASE} min-w-10 px-3 tabular-nums`;

/** Página activa: verde sólido, el mismo "estás acá" de los chips. */
const PILDORA_ACTIVA =
  `${PILDORA_NUMERO} border-green-700 bg-green-700 font-semibold text-cream`;

/** Página inactiva: quieta sobre crema, se enciende al dorado en hover. */
const PILDORA_IDLE =
  `${PILDORA_NUMERO} border-sand/80 bg-white/70 font-medium text-green-800/75 hover:border-gold-400 hover:bg-white hover:text-green-800`;

/** Anterior/Siguiente: llevan texto, un poco más de aire. */
const FLECHA_BASE = `${PILDORA_BASE} px-4`;

/** Flecha navegable. */
const FLECHA_HABIL =
  `${FLECHA_BASE} border-sand/80 bg-white/70 font-semibold text-green-800 hover:border-gold-400 hover:bg-white`;

/** Flecha en el borde: sin href no hay link — un span mudo que
 *  preserva el layout y anuncia que no hay a dónde ir. */
const FLECHA_INHABIL =
  `${FLECHA_BASE} cursor-not-allowed select-none border-sand/60 bg-transparent font-semibold text-green-800/40`;

interface PaginacionProps {
  /** Página que se está viendo (ya acotada por `paginar`). */
  paginaActual: number;
  /** Math.ceil(total / porPagina) — con ≤ 1 el nav no se renderiza. */
  totalPaginas: number;
  /** Arma el href de cada página (buildPageHref sobre la URL base de la vista). */
  buildHref: (page: number) => string;
  /** Clases extra para el <nav> (margen según el contexto). */
  className?: string;
}

export default function Paginacion({
  paginaActual,
  totalPaginas,
  buildHref,
  className = "",
}: PaginacionProps) {
  // Una sola página (o ninguna): no hay a dónde ir.
  if (totalPaginas <= 1) {
    return null;
  }

  const paginas = calcularPaginas(paginaActual, totalPaginas);

  return (
    <nav aria-label="Paginación" className={className}>
      {/* Contexto para lectores de pantalla: los números solos no dicen
          cuánta vista queda atrás ni adelante. */}
      <p className="sr-only">
        Página {paginaActual} de {totalPaginas}
      </p>
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          {paginaActual > 1 ? (
            <Link href={buildHref(paginaActual - 1)} className={FLECHA_HABIL}>
              Anterior
            </Link>
          ) : (
            <span aria-disabled="true" className={FLECHA_INHABIL}>
              Anterior
            </span>
          )}
        </li>
        {paginas.map((pagina, indice) =>
          pagina === SALTO_PAGINAS ? (
            <li key={`salto-${indice}`} aria-hidden="true">
              <span className="px-1 text-sm text-green-800/40">…</span>
            </li>
          ) : (
            <li key={pagina}>
              {pagina === paginaActual ? (
                <span aria-current="page" className={PILDORA_ACTIVA}>
                  {pagina}
                </span>
              ) : (
                <Link href={buildHref(pagina)} className={PILDORA_IDLE}>
                  {pagina}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {paginaActual < totalPaginas ? (
            <Link href={buildHref(paginaActual + 1)} className={FLECHA_HABIL}>
              Siguiente
            </Link>
          ) : (
            <span aria-disabled="true" className={FLECHA_INHABIL}>
              Siguiente
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
