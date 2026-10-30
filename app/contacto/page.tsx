import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import ContactForm from "@/components/ContactForm";
import HoursList from "@/components/HoursList";
import {
  IconClock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconWhatsApp,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Contacto",
  description: `Escríbenos por WhatsApp, llámanos o mándanos un correo a ${BUSINESS.name}, herbolaria en ${BUSINESS.address.city}, ${BUSINESS.address.state}.`,
};

const CHANNELS = [
  {
    icon: IconWhatsApp,
    name: "WhatsApp",
    value: BUSINESS.whatsapp.display,
    href: BUSINESS.whatsapp.url,
    external: true,
    note: "El canal más rápido para atenderte.",
  },
  {
    icon: IconPhone,
    name: "Llamadas",
    value: BUSINESS.phone.display,
    href: `tel:${BUSINESS.phone.tel}`,
    external: false,
    note: "Número distinto al de WhatsApp.",
  },
  {
    icon: IconMail,
    name: "Correo",
    value: BUSINESS.email,
    href: `mailto:${BUSINESS.email}`,
    external: false,
    note: "Para pedidos o mensajes largos.",
  },
  {
    icon: IconMapPin,
    name: "Dirección",
    value: `${BUSINESS.address.street}, ${BUSINESS.address.neighborhood}, ${BUSINESS.address.city}, ${BUSINESS.address.state}.`,
    href: "/ubicacion",
    external: false,
    note: "Ver mapa y cómo llegar.",
  },
] as const;

export default function ContactoPage() {
  return (
    <>
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-green-800 sm:text-5xl">
          Contacto
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-green-800/80">
          Para dudas, pedidos o asesoría: mándanos un mensaje y te contestamos,
          o usa el canal que prefieras.
        </p>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          {/* Canales directos */}
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col gap-4">
              {CHANNELS.map(
                ({
                  icon: ChannelIcon,
                  name,
                  value,
                  href,
                  external,
                  note,
                }) => (
                  <li key={name}>
                    <div className="flex h-full items-start gap-4 rounded-xl border border-sand bg-white/70 p-5">
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
                      >
                        <ChannelIcon className="h-5.5 w-5.5" />
                      </span>
                      <div>
                        <h2 className="font-display text-lg font-semibold text-green-800">
                          {name}
                        </h2>
                        {external ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-base font-semibold text-green-800 underline-offset-4 transition-colors hover:text-green-700 hover:underline"
                          >
                            {value}
                          </a>
                        ) : href.startsWith("/") ? (
                          <Link
                            href={href}
                            className="mt-1 inline-block text-base font-semibold text-green-800 underline-offset-4 transition-colors hover:text-green-700 hover:underline"
                          >
                            {value}
                          </Link>
                        ) : (
                          <a
                            href={href}
                            className="mt-1 inline-block text-base font-semibold text-green-800 underline-offset-4 transition-colors hover:text-green-700 hover:underline"
                          >
                            {value}
                          </a>
                        )}
                        <p className="mt-1 text-sm leading-relaxed text-green-800/65">
                          {note}
                        </p>
                      </div>
                    </div>
                  </li>
                ),
              )}
            </ul>

            <div className="rounded-xl border border-sand bg-cream-dark/50 p-5">
              <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold text-green-800">
                <IconClock className="h-5 w-5 shrink-0 text-terracotta-600" />
                Horario de atención
              </h2>
              <div className="mt-3 text-sm">
                <HoursList />
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="rounded-xl border border-sand bg-white/70 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-green-800">
              Mándanos tu mensaje
            </h2>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-green-800/70">
              Llena el formulario y se abre WhatsApp con tu mensaje listo para
              enviar.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
