import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import HoursList from "./HoursList";
import {
  IconFacebook,
  IconInstagram,
  IconMail,
  IconMapPin,
  IconPhone,
  IconWhatsApp,
} from "./icons";

const EXPLORE_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/ubicacion", label: "Ubicación" },
  { href: "/contacto", label: "Contacto" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
  { href: "/cookies", label: "Cookies" },
] as const;

const fullAddress = [
  BUSINESS.address.street,
  BUSINESS.address.neighborhood,
  BUSINESS.address.city,
  BUSINESS.address.state,
  BUSINESS.address.country,
].join(", ");

const SOCIAL_LINKS = [
  {
    href: BUSINESS.social.facebook,
    label: "Facebook de Herbario Del 7",
    icon: IconFacebook,
  },
  {
    href: BUSINESS.social.instagram,
    label: "Instagram de Herbario Del 7",
    icon: IconInstagram,
  },
] as const;

const contactClass =
  "flex items-center gap-2.5 rounded-md underline-offset-4 transition-colors hover:text-gold-200 hover:underline";
const contactIconClass = "h-4.5 w-4.5 shrink-0 text-gold-300";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-green-900 text-cream">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.7fr] lg:gap-12">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.svg"
                alt=""
                width={44}
                height={44}
                className="h-10 w-10"
              />
              <span className="font-display text-xl font-semibold tracking-tight">
                {BUSINESS.name}
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/75">
              Herbolaria y artículos esotéricos y naturistas en Frontera,
              Coahuila. Hierbas, veladoras, preparados y asesoría tradicional.
            </p>
            <ul className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, icon: SocialIcon }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/25 text-cream/85 transition-colors hover:border-gold-300 hover:text-gold-200"
                  >
                    <SocialIcon className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto (NAP completo, siempre desde BUSINESS) */}
          <div>
            <h2 className="font-display text-base font-semibold text-gold-200">
              Contáctanos
            </h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-cream/85">
              <li>
                <Link href="/ubicacion" className={contactClass}>
                  <IconMapPin className={contactIconClass} />
                  {fullAddress}
                </Link>
              </li>
              <li>
                <a
                  href={`tel:${BUSINESS.phone.tel}`}
                  className={contactClass}
                  aria-label={`Llamar al ${BUSINESS.phone.display}`}
                >
                  <IconPhone className={contactIconClass} />
                  {BUSINESS.phone.display}
                </a>
              </li>
              <li>
                <a
                  href={BUSINESS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactClass}
                  aria-label={`WhatsApp al ${BUSINESS.whatsapp.display}`}
                >
                  <IconWhatsApp className={contactIconClass} />
                  {BUSINESS.whatsapp.display}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className={contactClass}
                  aria-label={`Correo a ${BUSINESS.email}`}
                >
                  <IconMail className={contactIconClass} />
                  {BUSINESS.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Horario */}
          <div>
            <h2 className="font-display text-base font-semibold text-gold-200">
              Horario
            </h2>
            <div className="mt-4 text-sm">
              <HoursList tone="green" />
            </div>
          </div>

          {/* Explora */}
          <div>
            <h2 className="font-display text-base font-semibold text-gold-200">
              Explora
            </h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-cream/85">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={contactClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-cream/15 pt-6 text-sm text-cream/70 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {BUSINESS.name}. Todos los derechos reservados.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="underline-offset-4 transition-colors hover:text-gold-200 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
