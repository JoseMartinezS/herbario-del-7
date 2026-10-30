import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BUSINESS } from "@/content/business";
import { CATEGORY_INFO } from "@/lib/types";
import {
  getFeaturedProducts,
  getProductBySlug,
  getProducts,
  getProductsByCategory,
} from "@/lib/products";
import ProductCard, { CATEGORY_STYLES } from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import {
  IconArrowLeft,
  IconChevronRight,
  IconWhatsApp,
} from "@/components/icons";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/** Pre-renderiza la ficha de cada producto del catálogo. */
export function generateStaticParams() {
  return getProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return { title: "Producto no encontrado" };
  }
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: `${product.name} | Herbario Del 7`,
      description: product.shortDescription,
      url: `/catalogo/${product.slug}`,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const categoryInfo = CATEGORY_INFO[product.category];
  const whatsappUrl = `${BUSINESS.whatsapp.url}?text=${encodeURIComponent(
    `Hola, me interesa: ${product.name} (lo vi en el sitio web)`,
  )}`;

  // Relacionados: primero la misma familia (máx. 3); si el producto es
  // único en su categoría, los destacados de la casa excluyendo el actual.
  const sameCategory = getProductsByCategory(product.category)
    .filter((item) => item.slug !== product.slug)
    .slice(0, 3);
  const related =
    sameCategory.length > 0
      ? sameCategory
      : getFeaturedProducts()
          .filter((item) => item.slug !== product.slug)
          .slice(0, 3);
  const relatedHeading =
    sameCategory.length > 0
      ? {
          title: `Más de ${categoryInfo.name}`,
          intro: "Otros productos de esta misma familia.",
        }
      : {
          title: "Los más pedidos de la casa",
          intro: "Lo que más nos piden en el mostrador.",
        };

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-20">
        {/* Miga de pan: Catálogo › Categoría › Producto */}
        <nav aria-label="Ruta de navegación">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-green-800/70">
            <li>
              <Link
                href="/catalogo"
                className="underline-offset-4 transition-colors hover:text-green-800 hover:underline"
              >
                Catálogo
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <IconChevronRight className="h-3.5 w-3.5 text-gold-600" />
            </li>
            <li>
              <Link
                href={`/catalogo?categoria=${product.category}`}
                className="underline-offset-4 transition-colors hover:text-green-800 hover:underline"
              >
                {categoryInfo.name}
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <IconChevronRight className="h-3.5 w-3.5 text-gold-600" />
            </li>
            <li aria-current="page" className="font-medium text-green-800">
              {product.name}
            </li>
          </ol>
        </nav>

        <article className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          {/* Imagen enmarcada con el doble filete dorado de la marca */}
          <figure>
            <div className="rounded-2xl border-2 border-gold-600/60 p-1.5 sm:p-2">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-cream-dark ring-1 ring-inset ring-gold-600/40">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
            </div>
          </figure>

          <div>
            <Link
              href={`/catalogo?categoria=${product.category}`}
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium underline-offset-4 transition-colors hover:underline ${CATEGORY_STYLES[product.category]}`}
            >
              {categoryInfo.name}
            </Link>

            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-balance text-green-800 sm:text-4xl lg:text-5xl">
              {product.name}
            </h1>

            {/* Precio: cifra grande, o bloque de consulta por WhatsApp */}
            <div className="mt-5">
              {product.price !== null ? (
                <p className="font-display text-3xl font-semibold tracking-tight text-gold-800 sm:text-4xl">
                  ${product.price}
                  <span className="ml-2 font-sans text-base font-medium text-gold-700">
                    MXN
                  </span>
                </p>
              ) : (
                <div className="rounded-xl border-2 border-terracotta-300/80 bg-terracotta-50 p-4 sm:p-5">
                  <p className="font-display text-xl font-semibold text-terracotta-800">
                    Consulta el precio por WhatsApp
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-terracotta-700">
                    Te confirmamos precio y disponibilidad al momento, sin
                    compromiso.
                  </p>
                </div>
              )}
            </div>

            {/* CTAs: WhatsApp con mensaje prellenado + volver al catálogo */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-whatsapp-deep px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-whatsapp-deep-hover"
              >
                <IconWhatsApp className="h-5 w-5" />
                {product.price === null
                  ? "Consultar precio por WhatsApp"
                  : "Consultar por WhatsApp"}
              </a>
              <Link
                href="/catalogo"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-green-700 px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:bg-green-700 hover:text-cream"
              >
                <IconArrowLeft className="h-4.5 w-4.5" />
                Seguir viendo el catálogo
              </Link>
            </div>

            {/* Descripción larga: párrafos separados por línea en blanco */}
            <div className="mt-8 space-y-4">
              {product.description.split("\n\n").map((paragraph, index) => (
                <p
                  key={index}
                  className="text-pretty text-base leading-relaxed text-green-800/80 sm:text-lg"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </article>
      </div>

      {/* Relacionados: banda crema-oscuro como los destacados del home */}
      <section className="border-y border-sand/60 bg-cream-dark/50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title={relatedHeading.title}
            intro={relatedHeading.intro}
          />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((relatedProduct) => (
              <li key={relatedProduct.slug} className="h-full">
                <ProductCard product={relatedProduct} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
