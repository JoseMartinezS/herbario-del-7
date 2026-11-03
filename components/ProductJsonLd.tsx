import {
  buildBreadcrumbSchema,
  buildProductSchema,
} from "@/lib/product-schema";
import { SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/types";

/**
 * Datos estructurados (schema.org) de la ficha de producto, en formato
 * JSON-LD: `Product` y `BreadcrumbList`.
 *
 * Se monta en app/catalogo/[slug]/page.tsx. Los generadores son funciones
 * puras en lib/product-schema.ts (testeadas con Vitest); este componente
 * solo los serializa. La ficha `Store` del negocio es global y vive
 * aparte en components/JsonLd.tsx: aquí no se duplica.
 */
export default function ProductJsonLd({ product }: { product: Product }) {
  // El `<` se escapa a su secuencia unicode para que un valor malicioso
  // no pueda cerrar el <script> (práctica recomendada por Next.js).
  const productJson = JSON.stringify(buildProductSchema(product, SITE_URL)).replace(
    /</g,
    "\\u003c",
  );
  const breadcrumbJson = JSON.stringify(
    buildBreadcrumbSchema(product, SITE_URL),
  ).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJson }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJson }}
      />
    </>
  );
}
