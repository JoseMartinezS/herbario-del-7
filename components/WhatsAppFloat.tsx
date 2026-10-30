import { BUSINESS } from "@/content/business";
import { IconWhatsApp } from "./icons";

/** Botón fijo de WhatsApp: objetivo táctil de 56 px, siempre visible (z-50). */
export default function WhatsAppFloat() {
  return (
    <a
      href={BUSINESS.whatsapp.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg shadow-green-950/30 ring-1 ring-green-950/20 transition-colors hover:bg-whatsapp-hover"
    >
      <IconWhatsApp className="h-7 w-7" />
    </a>
  );
}
