/**
 * Iconografía SVG inline de Herbario Del 7.
 *
 * Convenciones:
 * - Iconos de utilidad: trazo (stroke 1.8, extremos y esquinas redondeados),
 *   heredan el color del texto vía `currentColor`.
 * - Glifos de marca (WhatsApp, Facebook): relleno (`fill`), también currentColor.
 * - Todos son decorativos: `aria-hidden` + `focusable="false"`. El significado
 *   lo aporta siempre el texto o el aria-label del elemento que los contiene.
 * - Se dimensionan por clase (`h-5 w-5`, etc.); nunca llevan color propio.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const strokeDefaults = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Glifo de WhatsApp (burbuja + auricular), relleno. */
export function IconWhatsApp(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      {...props}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 18.13c-1.56 0-3.09-.42-4.43-1.21l-.32-.19-3.28.86.87-3.2-.2-.32a8.16 8.16 0 0 1-1.25-4.36c0-4.54 3.7-8.23 8.24-8.23s8.23 3.7 8.23 8.23-3.69 8.24-8.23 8.24m4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.13-.17.24-.64.8-.78.96-.14.17-.29.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.03-.43-.07-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.65.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z" />
    </svg>
  );
}

/** Auricular de teléfono, para enlaces `tel:`. */
export function IconPhone(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

/** Sobre de correo, para enlaces `mailto:`. */
export function IconMail(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="2.5" />
      <path d="m3.5 7.5 8.5 5.5 8.5-5.5" />
    </svg>
  );
}

/** Pin de mapa, para la dirección. */
export function IconMapPin(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="M20 10.2c0 6.1-8 11.8-8 11.8s-8-5.7-8-11.8a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** Reloj, para horarios. */
export function IconClock(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/** Glifo de Facebook, relleno. */
export function IconFacebook(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      {...props}
    >
      <path d="M14 8.5h2.3l.3-2.7H14V4.1c0-.8.2-1.3 1.4-1.3h1.5V.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.7H8.6v2.7H11V21h3z" />
    </svg>
  );
}

/** Trazo de Instagram: marco redondeado + lente + punto. */
export function IconInstagram(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4.5" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Brote botánico (tallo con dos pares de hojas): ornamento de la marca. */
export function IconSprig(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="M12 21.5V7" />
      <path d="M12 15.5c-3.8 0-5.8-1.8-6.2-4.7 3.6-.2 6.2 1.5 6.2 4.7z" />
      <path d="M12 15.5c3.8 0 5.8-1.8 6.2-4.7-3.6-.2-6.2 1.5-6.2 4.7z" />
      <path d="M12 10c-2.9 0-4.5-1.5-4.8-3.8C9.9 6 12 7.4 12 10z" />
      <path d="M12 10c2.9 0 4.5-1.5 4.8-3.8C14.1 6 12 7.4 12 10z" />
    </svg>
  );
}

/** Hoja sencilla con vena, para “calidad natural”. */
export function IconLeaf(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="M5.5 18.5C5.5 10.5 11 4.5 20 4.5c0 9-6 14-14.5 14z" />
      <path d="M5.5 18.5C9 14 13 10 17.5 7" />
    </svg>
  );
}

/** Burbuja de conversación, para “atención personalizada”. */
export function IconChat(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="M12 4c-4.6 0-8.5 3-8.5 6.8 0 2.2 1.2 4.1 3.1 5.4L5.5 20l4.3-1.6c.7.1 1.4.2 2.2.2 4.6 0 8.5-3 8.5-6.8S16.6 4 12 4z" />
    </svg>
  );
}

/** Chevron derecho, separador de la miga de pan. */
export function IconChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  );
}

/** Flecha izquierda, para volver al catálogo. */
export function IconArrowLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

/** Escudo con un brote dentro, para “confianza”. */
export function IconShield(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...strokeDefaults} {...props}>
      <path d="M12 3l7.5 2.8v5.4c0 4.9-3.2 8.4-7.5 10.8C7.7 19.6 4.5 16.1 4.5 11.2V5.8z" />
      <path d="M12 16.5v-7" />
      <path d="M12 13.2c-1.9 0-3-1-3.2-2.6 1.9-.1 3.2.8 3.2 2.6z" />
      <path d="M12 13.2c1.9 0 3-1 3.2-2.6-1.9-.1-3.2.8-3.2 2.6z" />
    </svg>
  );
}
