import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import LegalPage, { type LegalSectionData } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: `Este sitio de ${BUSINESS.name} no usa cookies de análisis ni de publicidad: solo las técnicas esenciales del navegador. Conoce el detalle y cómo gestionar las cookies en tu navegador.`,
};

const SECTIONS: readonly LegalSectionData[] = [
  {
    id: "que-son",
    title: "Qué son las cookies",
    content: (
      <p>
        Las cookies son pequeños archivos de texto que un sitio web puede
        guardar en tu navegador para “recordar” cosas: mantener una sesión
        abierta, recordar tus preferencias o medir cómo se usa el sitio. No
        son programas ni virus; son notas que el sitio deja en tu dispositivo
        y que puedes borrar cuando quieras.
      </p>
    ),
  },
  {
    id: "hoy",
    title: "Qué usa este sitio hoy",
    content: (
      <>
        <p>
          Este sitio <strong>no utiliza cookies de análisis ni de
          publicidad</strong>. No hay Meta Pixel, no hay Google Analytics y no
          hay rastreadores de terceros midiendo tu visita.
        </p>
        <p>
          Solo intervienen las <strong>funciones técnicas esenciales</strong>{" "}
          del navegador (como la caché de las páginas y las preferencias de
          sesión) que cualquier sitio necesita para funcionar y cargarse bien.
          Por eso no verás un banner pidiendo “aceptar cookies”: no hay nada
          que aceptar ni que rechazar.
        </p>
        <p>
          Lo que compartes en el formulario de contacto nunca se guarda en
          servidores nuestros; el detalle está en la{" "}
          <Link href="/privacidad">política de privacidad</Link>.
        </p>
      </>
    ),
  },
  {
    id: "futuro",
    title: "Si algún día agregamos herramientas de medición",
    content: (
      <>
        <p>
          En el futuro podríamos agregar herramientas de análisis o marketing
          (por ejemplo, el píxel de Meta para medir campañas en Facebook e
          Instagram). Si eso sucede, esto es lo que haremos:
        </p>
        <ol>
          <li>
            Te lo avisaremos de forma clara: un aviso visible en el sitio y
            esta política actualizada con la fecha del cambio.
          </li>
          <li>
            Actualizaremos también la política de privacidad para describir
            qué datos se recaban con esas herramientas.
          </li>
          <li>
            Pediremos tu consentimiento para todo lo que la normativa mexicana
            de protección de datos personales vigente lo requiera, con opción
            de decir que no.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "gestionar",
    title: "Cómo gestionar o eliminar cookies en tu navegador",
    content: (
      <>
        <p>
          Puedes ver, bloquear o borrar las cookies en la configuración de tu
          navegador. La ruta exacta cambia entre versiones, pero el camino
          general es este:
        </p>
        <ul>
          <li>
            <strong>Chrome y Edge (computadora):</strong> Configuración →
            Privacidad y seguridad → Cookies y otros datos de sitios. Ahí
            puedes bloquearlas o borrar las guardadas.
          </li>
          <li>
            <strong>Firefox:</strong> Ajustes → Privacidad y seguridad →
            Cookies y datos de sitios.
          </li>
          <li>
            <strong>Safari en iPhone o iPad:</strong> Ajustes → Aplicaciones →
            Safari → Avanzado → Datos de sitios web.
          </li>
          <li>
            <strong>Safari en Mac:</strong> menú Safari → Ajustes →
            Privacidad.
          </li>
        </ul>
        <p>
          Otra opción es navegar en modo incógnito o privado: esas sesiones no
          guardan cookies al cerrarse.
        </p>
        <p>
          Un detalle honesto: como este sitio hoy no usa cookies de rastreo,
          borrarlas no cambia nada aquí — pero te sirve para el resto de los
          sitios que visitas.
        </p>
      </>
    ),
  },
  {
    id: "contacto",
    title: "Contacto",
    content: (
      <p>
        Si tienes preguntas sobre esta política, escríbenos a{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> o por
        WhatsApp al{" "}
        <a
          href={BUSINESS.whatsapp.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {BUSINESS.whatsapp.display}
        </a>
        . También puedes revisar la{" "}
        <Link href="/privacidad">política de privacidad</Link> para saber cómo
        tratamos tus datos personales.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de cookies"
      intro="En corto: hoy este sitio no usa cookies de rastreo. Aquí te explicamos qué son, qué usa exactamente este sitio, qué pasaría si algún día medimos campañas y cómo limpiar las cookies de tu navegador."
      updated="30 de octubre de 2026"
      sections={SECTIONS}
    />
  );
}
