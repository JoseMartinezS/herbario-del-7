import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import { CATEGORIES, CATEGORY_INFO, type Category } from "@/lib/types";
import {
  getCategoriesWithCounts,
  getProducts,
  getProductsByCategory,
} from "@/lib/products";
import CategoryFilter from "@/components/CategoryFilter";
import ProductCard from "@/components/ProductCard";
import SprigDivider from "@/components/SprigDivider";

const CATALOGO_DESCRIPTION =
  "Catálogo de Herbario Del 7: veladoras de 7 días, hierbas y preparados, aguas de riego, lociones, cápsulas y suplementos, y cuidado natural, con asesoría tradicional en Frontera, Coahuila.";

export const metadata: Metadata = {
  title: "Catálogo",
  description: CATALOGO_DESCRIPTION,
  openGraph: {
    title: "Catálogo | Herbario Del 7",
    description: CATALOGO_DESCRIPTION,
    url: "/catalogo",
  },
};

/**
 * Valida el query param `categoria` contra las categorías reales.
 * Acepta `string | string[]` (si el parámetro se repite en la URL llega como
 * arreglo) y degrada a “Todas” ante cualquier valor inválido o vacío.
 */
function parseCategory(value: string | string[] | undefined): Category | null {
  if (typeof value !== "string") return null;
  return (CATEGORIES as readonly string[]).includes(value)
    ? (value as Category)
    : null;
}

interface CatalogoPageProps {
  searchParams: Promise<{ categoria?: string | string[] }>;
}

export default async function CatalogoPage({
  searchParams,
}: CatalogoPageProps) {
  const { categoria } = await searchParams;
  const active = parseCategory(categoria);

  const allProducts = getProducts();
  const categoriesWithCounts = getCategoriesWithCounts();
  const products = active
    ? getProductsByCategory(active)
    : allProducts;

  const countLabel = active
    ? `${products.length} ${
        products.length === 1 ? "producto" : "productos"
      } en ${CATEGORY_INFO[active].name}`
    : `${products.length} ${
        products.length === 1 ? "producto" : "productos"
      }`;

  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-green-800 sm:text-5xl">
          Catálogo del herbolario
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-green-800/80">
          La vitrina del mostrador ordenada por familias: hierbas y preparados
          de siempre, veladoras para cada intención, aguas y riegos, lociones,
          cápsulas y cuidado natural. Filtra por categoría o recorre todo de
          corrido.
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <SprigDivider className="w-full" />

        <div className="mt-8">
          <CategoryFilter
            active={active}
            options={categoriesWithCounts}
            totalCount={allProducts.length}
          />
        </div>

        <p className="mt-6 text-sm font-medium text-green-800/70">
          {countLabel}
        </p>

        {products.length > 0 ? (
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product.slug} className="h-full">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-14 text-center sm:py-16">
            <p className="font-display text-xl font-semibold text-green-800">
              {active
                ? "Esta familia está en descanso"
                : "El mostrador está en reposición"}
            </p>
            <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-green-800/70">
              {active
                ? `Por ahora no hay productos publicados en ${CATEGORY_INFO[active].name}. Vuelve pronto: el mostrador se surte seguido.`
                : "Por ahora no hay productos publicados. Escríbenos por WhatsApp si buscas algo en particular y te decimos qué hay en mostrador."}
            </p>
            <p className="mt-6">
              {active ? (
                <Link
                  href="/catalogo"
                  className="text-base font-semibold text-green-800 underline decoration-gold-500 decoration-2 underline-offset-[6px] transition-colors hover:text-green-700"
                >
                  Ver todo el catálogo
                </Link>
              ) : (
                <a
                  href={BUSINESS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-green-800 underline decoration-gold-500 decoration-2 underline-offset-[6px] transition-colors hover:text-green-700"
                >
                  Preguntar por WhatsApp
                </a>
              )}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
