/**
 * Fuente única de verdad del NAP (Name, Address, Phone) de Herbario Del 7.
 *
 * Todo componente, metadato o JSON-LD que necesite datos del negocio debe
 * leerlos de aquí — NUNCA duplicar estos valores en otro archivo.
 *
 * `as const` + `satisfies` conservan los literales exactos y a la vez
 * validan la forma contra BusinessInfo (tipado estricto).
 */

/** Turno de atención: días legibles + horario de apertura y cierre ("HH:MM"). */
export interface BusinessHours {
  /** Días del turno en español, p. ej. ["Lunes", "Martes"] o ["Domingo"]. */
  days: readonly string[];
  /** Hora de apertura en formato 24 h, p. ej. "09:00". */
  open: string;
  /** Hora de cierre en formato 24 h, p. ej. "14:00". */
  close: string;
}

/** Forma completa del negocio (para validar BUSINESS con `satisfies`). */
export interface BusinessInfo {
  name: string;
  description: string;
  phone: { display: string; tel: string };
  whatsapp: { display: string; url: string };
  email: string;
  address: {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    /** Texto listo para el parámetro `q` de Google Maps. */
    mapsQuery: string;
  };
  /**
   * Turnos de atención. Lunes a sábado hay dos turnos (matutino y vespertino,
   * cierran 1 h para comida); domingo abre un solo turno matutino.
   * Fácil de renderizar (lista de turnos) y de mapear a JSON-LD
   * (openingHoursSpecification: `days` → dayOfWeek, `open`/`close` → opens/closes).
   */
  hours: readonly BusinessHours[];
  social: { facebook: string; instagram: string };
}

export const BUSINESS = {
  name: "Herbario Del 7",
  description:
    "Herbolaria en Frontera, Coahuila: hierbas, preparados, veladoras, aguas de riego, lociones y productos esotéricos y naturistas, con asesoría y atención tradicional.",
  /** Teléfono para llamadas (DISTINTO del WhatsApp). */
  phone: {
    display: "+52 866 635 7585",
    tel: "+528666357585",
  },
  whatsapp: {
    display: "+52 1 866 164 7442",
    url: "https://wa.me/5218661647442",
  },
  email: "caty5511@hotmail.com",
  address: {
    street: "Presidente Carranza #119",
    neighborhood: "Col. Guadalupe Borja",
    city: "Frontera",
    state: "Coahuila",
    country: "México",
    mapsQuery:
      "Presidente Carranza 119, Guadalupe Borja, Frontera, Coahuila, México",
  },
  hours: [
    {
      days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
      open: "09:00",
      close: "14:00",
    },
    {
      days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
      open: "15:00",
      close: "21:00",
    },
    {
      days: ["Domingo"],
      open: "10:00",
      close: "13:00",
    },
  ],
  social: {
    facebook: "https://www.facebook.com/HerbarioDel7",
    instagram: "https://www.instagram.com/herbariodel7/",
  },
} as const satisfies BusinessInfo;
