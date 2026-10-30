import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import SectionHeading from "@/components/SectionHeading";
import HoursList from "@/components/HoursList";
import { IconMapPin, IconPhone, IconWhatsApp } from "@/components/icons";

export const metadata: Metadata = {
  title: "Ubicación y horarios",
  description: `Dirección, mapa y horarios de ${BUSINESS.name} en ${BUSINESS.address.street}, ${BUSINESS.address.neighborhood}, ${BUSINESS.address.city}, ${BUSINESS.address.state}.`,
};

export default function UbicacionPage() {
  const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    BUSINESS.address.mapsQuery,
  )}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    BUSINESS.address.mapsQuery,
  )}`;

  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-green-800 sm:text-5xl">
          Ubicación y horarios
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-green-800/80">
          Estamos en la {BUSINESS.address.neighborhood}, en{" "}
          {BUSINESS.address.city}, {BUSINESS.address.state}. Aquí tienes el
          mapa, los horarios completos y cómo llegar.
        </p>
      </header>

      {/* Mapa y datos de contacto */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-8">
          <div className="overflow-hidden rounded-xl border border-sand shadow-sm">
            <iframe
              src={mapsEmbedUrl}
              title="Mapa de ubicación de Herbario Del 7"
              loading="lazy"
              className="h-full min-h-72 w-full sm:min-h-80"
            />
          </div>

          <div className="flex flex-col gap-6">
            {/* Dirección */}
            <div className="rounded-xl border border-sand bg-white/70 p-6">
              <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold text-green-800">
                <IconMapPin className="h-5 w-5 shrink-0 text-terracotta-600" />
                Dirección
              </h2>
              <address className="mt-4 not-italic">
                <p className="text-pretty text-base leading-relaxed text-green-800/85">
                  {BUSINESS.address.street}
                  <br />
                  {BUSINESS.address.neighborhood}
                  <br />
                  {BUSINESS.address.city}, {BUSINESS.address.state},{" "}
                  {BUSINESS.address.country}
                </p>
              </address>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-terracotta-700 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-terracotta-800"
              >
                Cómo llegar
              </a>
            </div>

            {/* Teléfonos: llamadas y WhatsApp son números distintos */}
            <div className="rounded-xl border border-sand bg-white/70 p-6">
              <h2 className="font-display text-xl font-semibold text-green-800">
                Teléfonos
              </h2>
              <ul className="mt-4 flex flex-col gap-4">
                <li>
                  <h3 className="text-sm font-semibold text-green-800/60">
                    Llamadas
                  </h3>
                  <a
                    href={`tel:${BUSINESS.phone.tel}`}
                    className="mt-1 flex items-center gap-2.5 text-base font-semibold text-green-800 underline-offset-4 transition-colors hover:text-green-700 hover:underline"
                  >
                    <IconPhone className="h-5 w-5 shrink-0 text-terracotta-600" />
                    {BUSINESS.phone.display}
                  </a>
                </li>
                <li>
                  <h3 className="text-sm font-semibold text-green-800/60">
                    WhatsApp
                  </h3>
                  <a
                    href={BUSINESS.whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-2.5 text-base font-semibold text-green-800 underline-offset-4 transition-colors hover:text-green-700 hover:underline"
                  >
                    <IconWhatsApp className="h-5 w-5 shrink-0 text-terracotta-600" />
                    {BUSINESS.whatsapp.display}
                  </a>
                  <p className="mt-1.5 text-sm text-green-800/60">
                    Es un número distinto al de llamadas.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Horarios completos */}
      <section className="border-t border-sand/60 bg-cream-dark/50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Horarios de atención"
            intro="Dos turnos de lunes a sábado (cerramos a la hora de la comida) y un turno corto el domingo."
          />
          <div className="mt-6 max-w-prose text-base">
            <HoursList showLunchNote />
          </div>
          <p className="mt-8 max-w-prose text-pretty text-sm leading-relaxed text-green-800/70">
            Para no venir en balde, puedes escribirnos por WhatsApp antes de
            visitarnos y confirmar que lo que buscas está en mostrador.
          </p>
          <div className="mt-6">
            <Link
              href="/contacto"
              className="text-base font-semibold text-green-800 underline decoration-gold-500 decoration-2 underline-offset-[6px] transition-colors hover:text-green-700"
            >
              Ir a contacto
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
