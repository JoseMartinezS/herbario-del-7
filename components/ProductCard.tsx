import Image from "next/image";
import Link from "next/link";
import { CATEGORY_INFO, type Category, type Product } from "@/lib/types";

/**
 * Tarjeta de producto del catálogo. Reutilizable en cualquier grid:
 * - `product`: producto tipado desde lib/products.ts.
 * - `sizes`: srcset de next/image según el ancho que ocupa la tarjeta
 *   en el grid donde vive (por defecto asume 1 col móvil / 2 tablet / 3 desktop).
 * - La tarjeta se estira (`h-full`) para alinear precios en filas desiguales.
 */

/** Tinte del badge por categoría: verde para lo vegetal, terracota para lo
    cálido (veladoras, lociones) y dorado para resinas/suplementos. */
export const CATEGORY_STYLES: Record<Category, string> = {
  veladoras: "border-terracotta-200 bg-terracotta-100 text-terracotta-800",
  "hierbas-y-preparados": "border-green-200 bg-green-100 text-green-800",
  "aguas-y-riegos": "border-green-200 bg-green-50 text-green-700",
  lociones: "border-terracotta-200 bg-terracotta-50 text-terracotta-800",
  "capsulas-y-suplementos": "border-gold-200 bg-gold-100 text-gold-800",
  "cuidado-personal": "border-green-200 bg-green-100 text-green-800",
  "sahumerios-e-inciensos": "border-gold-300 bg-gold-100 text-gold-900",
};

interface ProductCardProps {
  product: Product;
  /** sizes de next/image según el grid contenedor. */
  sizes?: string;
}

export default function ProductCard({
  product,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: ProductCardProps) {
  return (
    <Link
      href={`/catalogo/${product.slug}`}
      aria-label={`Ver detalles de ${product.name}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-sand/80 bg-white shadow-sm transition-shadow duration-200 hover:border-gold-400 hover:shadow-md motion-reduce:transition-none"
    >
      <div className="relative aspect-square overflow-hidden bg-cream-dark">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <span
          className={`self-start rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[product.category]}`}
        >
          {CATEGORY_INFO[product.category].name}
        </span>
        <h3 className="font-display text-lg font-semibold leading-snug text-green-800">
          {product.name}
        </h3>
        <p className="text-pretty text-sm leading-relaxed text-green-800/75">
          {product.shortDescription}
        </p>
        <p className="mt-auto pt-2 text-sm">
          {product.price !== null ? (
            <span className="font-semibold text-gold-800">
              ${product.price} MXN
            </span>
          ) : (
            <span className="font-medium text-terracotta-700">
              Consulta el precio por WhatsApp
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
