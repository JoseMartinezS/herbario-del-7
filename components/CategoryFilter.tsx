import Link from "next/link";
import type { Category } from "@/lib/types";
import { CATEGORY_STYLES } from "./ProductCard";

/**
 * Filtro de catálogo por categoría: píldoras-enlace (server-side, cero JS).
 *
 * Cada chip es un `<Link>` porque navega a una vista distinta de la URL
 * (guideline: el estado vive en el query param `?categoria=`), y el chip
 * activo marca `aria-current="page"`. El focus-visible lo resuelve el
 * outline terracota global de globals.css; el tinte del chip activo hereda
 * el lenguaje de los badges de familia de ProductCard (CATEGORY_STYLES).
 */

/** Entrada de categoría con conteo (forma de getCategoriesWithCounts). */
interface CategoryFilterOption {
  category: Category;
  name: string;
  count: number;
}

interface CategoryFilterProps {
  /** Categoría activa; `null` significa “Todas”. */
  active: Category | null;
  /** Categorías con al menos un producto. */
  options: CategoryFilterOption[];
  /** Total del catálogo, para el conteo del chip “Todas”. */
  totalCount: number;
}

/** Base común de cada chip: mismo grosor de borde activo/inactivo para
    que el cambio de tinte no mueva el layout. */
const CHIP_BASE =
  "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm transition-colors motion-reduce:transition-none";

/** Chip inactivo: neutro sobre crema, se enciende al dorado en hover. */
const CHIP_IDLE =
  "border-sand/80 bg-white/70 font-medium text-green-800/75 hover:border-gold-400 hover:bg-white hover:text-green-800";

/** Conteo pequeño alineado (tabular para que las cifras no bailen). */
function ChipCount({ count }: { count: number }) {
  return (
    <span className="text-xs font-semibold leading-none tabular-nums opacity-70">
      {count}
    </span>
  );
}

export default function CategoryFilter({
  active,
  options,
  totalCount,
}: CategoryFilterProps) {
  return (
    <nav aria-label="Filtrar catálogo por categoría">
      <ul className="flex flex-wrap gap-2.5">
        <li>
          <Link
            href="/catalogo"
            aria-current={active === null ? "page" : undefined}
            className={
              active === null
                ? `${CHIP_BASE} border-green-700 bg-green-700 font-semibold text-cream`
                : `${CHIP_BASE} ${CHIP_IDLE}`
            }
          >
            Todas
            <ChipCount count={totalCount} />
          </Link>
        </li>
        {options.map(({ category, name, count }) => {
          const isActive = active === category;
          return (
            <li key={category}>
              <Link
                href={`/catalogo?categoria=${category}`}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? `${CHIP_BASE} ${CATEGORY_STYLES[category]} font-semibold`
                    : `${CHIP_BASE} ${CHIP_IDLE}`
                }
              >
                {name}
                <ChipCount count={count} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
