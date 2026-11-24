import Image from "next/image";
import Link from "next/link";
import { estiloDeCategoria, nombreDeCategoria } from "@/lib/categories";
import type { Categoria, Product } from "@/lib/types";

/**
 * Tarjeta de producto del catálogo. Reutilizable en cualquier grid:
 * - `product`: producto tipado desde lib/products.ts.
 * - `categorias`: la lista vigente (getCategoryList): de acá salen la
 *   etiqueta legible y el tinte del badge de familia. Con categorías
 *   dinámicas (F2.5) nadie indexa un Record compilado — los helpers de
 *   lib/categories.ts resuelven con fallback y nunca crashean.
 * - `sizes`: srcset de next/image según el ancho que ocupa la tarjeta
 *   en el grid donde vive (por defecto asume 1 col móvil / 2 tablet / 3 desktop).
 * - La tarjeta se estira (`h-full`) para alinear precios en filas desiguales.
 */

interface ProductCardProps {
  product: Product;
  /** Categorías vigentes (para la etiqueta y el tinte del badge). */
  categorias: readonly Categoria[];
  /** sizes de next/image según el grid contenedor. */
  sizes?: string;
}

export default function ProductCard({
  product,
  categorias,
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
          className={`self-start rounded-full border px-2.5 py-0.5 text-xs font-medium ${estiloDeCategoria(
            categorias,
            product.category,
          )}`}
        >
          {nombreDeCategoria(categorias, product.category)}
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
