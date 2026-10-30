import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import { CATEGORIES, CATEGORY_INFO } from "@/lib/types";
import { getCategoriesWithCounts, getFeaturedProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import SprigDivider from "@/components/SprigDivider";
import HoursList from "@/components/HoursList";
import { IconClock, IconMapPin, IconPhone, IconWhatsApp } from "@/components/icons";

export const metadata: Metadata = {
  title: {
    absolute: `${BUSINESS.name} — Herbolaria y artículos esotéricos en Frontera, Coahuila`,
  },
  description: BUSINESS.description,
};

// TODO: reemplazar con testimonios reales de clientes (pedir autorización
// antes de publicar nombre o inicial).
const TESTIMONIALS = [
  {
    quote:
      "Me asesoraron con mucha paciencia para elegir la veladora y las hierbas. Siempre salgo con lo que necesitaba.",
    author: "María G., Frontera",
  },
  {
    quote:
      "El té de manzanilla con tila es de lo mejor que hay; se nota que las hierbas están frescas.",
    author: "Rubén T., Monclova",
  },
  {
    quote:
      "Llevo años comprando mis lociones y aguas de riego aquí. Atención de barrio, de las que ya casi no quedan.",
    author: "Lupita R., Frontera",
  },
] as const;

/** Medallón decorativo: sello de la marca con inscripción circular. */
function SealMedallion() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-56 sm:w-64 lg:w-full">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        <defs>
          <path
            id="anillo-sello"
            d="M200 200 m-158 0 a158 158 0 1 1 316 0 a158 158 0 1 1 -316 0"
            fill="none"
          />
        </defs>
        <circle cx="200" cy="200" r="178" fill="none" stroke="#D9A441" strokeWidth="2.5" opacity="0.7" />
        <circle cx="200" cy="200" r="138" fill="none" stroke="#D9A441" strokeWidth="1" opacity="0.5" />
        <text
          fill="#1F3D2A"
          fontSize="15"
          letterSpacing="3.5"
          fontFamily="var(--font-display)"
        >
          <textPath href="#anillo-sello">
            HIERBAS · VELADORAS · PREPARADOS · HERBOLARIA TRADICIONAL · FRONTERA · COAHUILA
          </textPath>
        </text>
        <g fill="#D9A441">
          <rect x="196" y="18" width="8" height="8" transform="rotate(45 200 22)" />
          <rect x="376" y="196" width="8" height="8" transform="rotate(45 380 200)" />
          <rect x="196" y="374" width="8" height="8" transform="rotate(45 200 378)" />
          <rect x="16" y="196" width="8" height="8" transform="rotate(45 20 200)" />
        </g>
      </svg>
      <Image
        src="/images/logo.svg"
        alt=""
        width={256}
        height={256}
        className="absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

export default function HomePage() {
  const featured = getFeaturedProducts();
  const categoriesWithCounts = getCategoriesWithCounts();

  return (
    <>
      {/* Hero: composición de etiqueta de botica, doble filete dorado */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pt-16">
        <div className="rounded-2xl border-2 border-gold-600/60 p-1.5 sm:p-2">
          <div className="rounded-xl p-6 ring-1 ring-inset ring-gold-600/40 sm:p-10 lg:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
              <div>
                <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-green-800 sm:text-5xl lg:text-6xl">
                  {BUSINESS.name}
                </h1>
                <p className="mt-5 max-w-prose text-pretty text-base leading-relaxed text-green-800/80 sm:text-lg">
                  {BUSINESS.description}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a
                    href={BUSINESS.whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 rounded-full bg-whatsapp-deep px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-whatsapp-deep-hover"
                  >
                    <IconWhatsApp className="h-5 w-5" />
                    Escríbenos por WhatsApp
                  </a>
                  <Link
                    href="/catalogo"
                    className="inline-flex items-center justify-center rounded-full border-2 border-green-700 px-6 py-3 text-base font-semibold text-green-800 transition-colors hover:bg-green-700 hover:text-cream"
                  >
                    Ver catálogo
                  </Link>
                </div>
              </div>
              <SealMedallion />
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <SprigDivider className="mx-auto mb-10 w-44" />
        <SectionHeading
          title="Lo que encontrarás en el herbolario"
          intro="Siete rincones de la casa: hierbas y preparados de siempre, veladoras para cada intención y cuidado personal con productos naturales."
        />
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => {
            const info = CATEGORY_INFO[category];
            const count =
              categoriesWithCounts.find((entry) => entry.category === category)
                ?.count ?? 0;
            return (
              <li key={category} className="h-full">
                <Link
                  href={`/catalogo?categoria=${category}`}
                  className="group flex h-full flex-col gap-3 rounded-xl border border-sand bg-white/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-white hover:shadow-md motion-reduce:transition-none"
                >
                  <span className="font-display text-xl font-semibold text-green-800 transition-colors group-hover:text-green-700">
                    {info.name}
                  </span>
                  <span className="text-pretty text-sm leading-relaxed text-green-800/70">
                    {info.description}
                  </span>
                  <span className="mt-auto pt-1 text-xs font-medium text-green-800/70">
                    {count} {count === 1 ? "producto" : "productos"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Destacados */}
      <section className="border-y border-sand/60 bg-cream-dark/50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Tres clásicos de la casa"
            intro="Con lo que más nos piden abrimos esta muestra del catálogo."
          />
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <li key={product.slug} className="h-full">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link
              href="/catalogo"
              className="text-base font-semibold text-green-800 underline decoration-gold-500 decoration-2 underline-offset-[6px] transition-colors hover:text-green-700"
            >
              Ver todo el catálogo
            </Link>
          </p>
        </div>
      </section>

      {/* Testimonios */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <SprigDivider className="mx-auto mb-10 w-44" />
        <SectionHeading title="Lo que dicen quienes nos visitan" />
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <li key={testimonial.author}>
              <blockquote className="flex h-full flex-col rounded-xl border border-sand/70 bg-white/60 p-6">
                <p className="text-pretty font-display text-lg leading-relaxed text-green-800">
                  “{testimonial.quote}”
                </p>
                <footer className="mt-4 text-sm font-medium text-green-800/70">
                  — {testimonial.author}
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </section>

      {/* Ubicación y horario resumidos */}
      <section className="border-y border-sand/60 bg-cream-dark/50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading title="Dónde y cuándo encontrarnos" />
            <div className="mt-6 flex flex-col gap-4">
              <p className="flex items-start gap-3 text-pretty text-base leading-relaxed text-green-800/85">
                <IconMapPin className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-600" />
                <span>
                  {BUSINESS.address.street}, {BUSINESS.address.neighborhood},{" "}
                  {BUSINESS.address.city}, {BUSINESS.address.state}.
                </span>
              </p>
              <Link
                href="/ubicacion"
                className="text-base font-semibold text-green-800 underline decoration-gold-500 decoration-2 underline-offset-[6px] transition-colors hover:text-green-700"
              >
                Ver ubicación y mapa
              </Link>
            </div>
          </div>
          <div>
            <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-green-800">
              <IconClock className="h-5 w-5 text-terracotta-600" />
              Horario de atención
            </h2>
            <div className="mt-4 text-base">
              <HoursList />
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-green-900 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gold-500/40 p-1.5">
            <div className="rounded-xl px-6 py-10 text-center ring-1 ring-inset ring-gold-500/25 sm:px-10">
              <h2 className="mx-auto max-w-xl font-display text-2xl font-semibold text-balance text-cream sm:text-3xl">
                ¿Buscas algo en especial para ti o para tu casa?
              </h2>
              <p className="mx-auto mt-4 max-w-prose text-pretty text-base leading-relaxed text-cream/80">
                Cuéntanos qué necesitas y con gusto te orientamos entre hierbas,
                veladoras y preparados para dar con lo indicado.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={BUSINESS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 rounded-full bg-gold-400 px-6 py-3.5 text-base font-semibold text-green-900 shadow-md transition-colors hover:bg-gold-300"
                >
                  <IconWhatsApp className="h-5 w-5" />
                  Escríbenos por WhatsApp
                </a>
                <a
                  href={`tel:${BUSINESS.phone.tel}`}
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-cream/70 px-6 py-3 text-base font-semibold text-cream transition-colors hover:bg-cream hover:text-green-900"
                >
                  <IconPhone className="h-5 w-5" />
                  Llámanos al {BUSINESS.phone.display}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
