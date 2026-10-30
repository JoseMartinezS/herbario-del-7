"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BUSINESS } from "@/content/business";
import { IconWhatsApp } from "./icons";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/ubicacion", label: "Ubicación" },
  { href: "/contacto", label: "Contacto" },
] as const;

/** El catálogo marca activo también en sus páginas de detalle. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const DESKTOP_LINK_BASE =
  "rounded-md px-3 py-2 text-sm font-medium underline-offset-[6px] transition-colors";
const DESKTOP_LINK_ACTIVE =
  "text-green-800 underline decoration-gold-500 decoration-2";
const DESKTOP_LINK_IDLE =
  "text-green-800/75 hover:text-green-800 hover:underline hover:decoration-gold-300";

const MOBILE_LINK_BASE = "rounded-lg px-4 py-3 text-base font-medium";
const MOBILE_LINK_ACTIVE = "bg-green-100 text-green-800";
const MOBILE_LINK_IDLE = "text-green-800/80 hover:bg-cream-dark hover:text-green-800";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Al navegar, el menú móvil se cierra solo.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape cierra el menú (restaura el foco al botón).
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        document.getElementById("boton-menu")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-sand/70 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-[4.5rem] lg:px-8">
        <Link
          href="/"
          aria-label={`${BUSINESS.name}: ir al inicio`}
          className="group flex items-center gap-2.5 sm:gap-3"
        >
          <Image
            src="/images/logo.svg"
            alt=""
            width={40}
            height={40}
            priority
            className="h-9 w-9 transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none sm:h-10 sm:w-10"
          />
          <span className="font-display text-lg font-semibold tracking-tight text-green-800 sm:text-xl">
            {BUSINESS.name}
          </span>
        </Link>

        {/* Navegación de escritorio */}
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`${DESKTOP_LINK_BASE} ${
                      active ? DESKTOP_LINK_ACTIVE : DESKTOP_LINK_IDLE
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Botón del menú móvil */}
        <button
          id="boton-menu"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="menu-movil"
          aria-label={menuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-12 w-12 items-center justify-center rounded-md text-green-800 transition-colors hover:bg-cream-dark md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            className="h-6 w-6"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Panel del menú móvil (mismo ancho que el contenido, pegado a la barra) */}
      <nav
        id="menu-movil"
        aria-label="Menú móvil"
        hidden={!menuOpen}
        className="border-t border-sand/70 bg-cream md:hidden"
      >
        <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`block ${MOBILE_LINK_BASE} ${
                    active ? MOBILE_LINK_ACTIVE : MOBILE_LINK_IDLE
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li className="mt-2 border-t border-sand/70 pt-3">
            <a
              href={BUSINESS.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 rounded-full bg-whatsapp-deep px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-whatsapp-deep-hover"
            >
              <IconWhatsApp className="h-5 w-5" />
              Escríbenos por WhatsApp
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
