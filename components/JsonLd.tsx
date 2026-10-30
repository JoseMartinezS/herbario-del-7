import { BUSINESS } from "@/content/business";
import { SITE_URL } from "@/lib/site";

/**
 * Datos estructurados (schema.org) del negocio, en formato JSON-LD.
 *
 * Se renderiza una sola vez en app/layout.tsx, así todas las páginas
 * exponen la ficha del local: nombre, contacto, dirección, horarios por
 * turno y redes sociales. Todo se lee de content/business.ts (fuente única
 * de verdad del NAP); aquí no se duplica ningún dato del negocio.
 */

/** Días en español (content/business.ts) → nombre en inglés que exige schema.org. */
const DAY_MAP: Record<string, string> = {
  Lunes: "Monday",
  Martes: "Tuesday",
  Miércoles: "Wednesday",
  Jueves: "Thursday",
  Viernes: "Friday",
  Sábado: "Saturday",
  Domingo: "Sunday",
};

/** Construye el objeto schema.org LocalBusiness (tipo Store) del herbolario. */
function buildStoreSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: BUSINESS.name,
    description: BUSINESS.description,
    telephone: BUSINESS.phone.tel,
    email: BUSINESS.email,
    url: SITE_URL,
    image: `${SITE_URL}/images/logo.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.state,
      addressCountry: "MX",
    },
    // Turnos tal cual están en BUSINESS: lunes–sábado dos franjas,
    // domingo una sola. `hours` ya está pensado para mapear 1:1.
    openingHoursSpecification: BUSINESS.hours.map((shift) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: shift.days.map((day) => DAY_MAP[day]),
      opens: shift.open,
      closes: shift.close,
    })),
    sameAs: [BUSINESS.social.facebook, BUSINESS.social.instagram],
  };
}

export default function JsonLd() {
  // El `<` se escapa a su secuencia unicode para que un valor malicioso
  // no pueda cerrar el <script> (práctica recomendada por Next.js).
  const jsonLd = JSON.stringify(buildStoreSchema()).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}
