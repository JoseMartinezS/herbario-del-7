import { CATEGORY_INFO } from "./types";
import type { Product } from "./types";

/**
 * Generadores de datos estructurados (schema.org) de la ficha de producto:
 * `Product` y `BreadcrumbList`, listos para serializar como JSON-LD.
 *
 * Funciones puras (producto + URL base → objeto schema): así se testean
 * con Vitest sin montar React. La serialización y el `<script>` viven en
 * components/ProductJsonLd.tsx, montado en app/catalogo/[slug]/page.tsx.
 *
 * La ficha `Store` del negocio (LocalBusiness) es global y vive aparte en
 * components/JsonLd.tsx; aquí no se duplica nada de ella.
 */

/** Oferta en pesos mexicanos, solo para productos con precio definido. */
interface OfferSchema {
  "@type": "Offer";
  price: number;
  priceCurrency: "MXN";
  availability: string;
  url: string;
}

/** schema.org Product de la ficha (sin offers si el precio es null). */
export interface ProductSchema {
  "@context": string;
  "@type": "Product";
  name: string;
  description: string;
  image: string;
  url: string;
  category: string;
  offers?: OfferSchema;
}

/** schema.org BreadcrumbList: Inicio › Catálogo › Producto. */
export interface BreadcrumbSchema {
  "@context": string;
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

/** URL absoluta de la ficha: {siteUrl}/catalogo/{slug}. */
function productUrl(product: Product, siteUrl: string): string {
  return `${siteUrl}/catalogo/${product.slug}`;
}

/**
 * Construye el schema Product del producto.
 *
 * `price: null` significa "consulta el precio por WhatsApp": el schema
 * sale SIN `offers` (ni precio 0 ni offers vacíos, que Google leería
 * como producto gratis).
 */
export function buildProductSchema(
  product: Product,
  siteUrl: string,
): ProductSchema {
  const url = productUrl(product, siteUrl);

  const schema: ProductSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    // La línea corta (máx. 140) es la misma de los metadatos de la ficha;
    // la descripción larga con \n\n no aporta al snippet del buscador.
    description: product.shortDescription,
    // El SVG se sirve desde public/: la ruta pública del JSON, absoluta.
    image: `${siteUrl}${product.image}`,
    url,
    // Etiqueta legible ("Veladoras"), no el slug de la URL.
    category: CATEGORY_INFO[product.category].name,
  };

  if (product.price !== null) {
    schema.offers = {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url,
    };
  }

  return schema;
}

/**
 * Construye el schema BreadcrumbList de la ficha: Inicio › Catálogo ›
 * Producto, con posiciones 1/2/3 y URLs absolutas (exigencia de Google
 * para poder resolver la miga de pan en resultados).
 */
export function buildBreadcrumbSchema(
  product: Product,
  siteUrl: string,
): BreadcrumbSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catálogo",
        item: `${siteUrl}/catalogo`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: productUrl(product, siteUrl),
      },
    ],
  };
}
