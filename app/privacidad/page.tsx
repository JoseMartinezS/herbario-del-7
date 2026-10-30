import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import LegalPage, { type LegalSectionData } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo recabamos y usamos tus datos personales en ${BUSINESS.name}: solo lo necesario para responder tus mensajes por WhatsApp o correo, y cómo ejercer tus derechos ARCO.`,
};

// Ley aplicable (verificada en la biblioteca jurídica de la Cámara de
// Diputados, LeyesBiblio, octubre de 2026): la ley vigente para particulares
// es la "Ley Federal de Protección de Datos Personales en Posesión de los
// Particulares", publicada en el DOF el 20 de marzo de 2025, que sustituyó
// a la homónima de 2010. (La "Ley General de ... Sujetos Obligados" del
// mismo decreto aplica al sector público, no a negocios.)
// Fuente: https://www.diputados.gob.mx/LeyesBiblio/ref/lfpdppp.htm

const EMAIL_URL = `mailto:${BUSINESS.email}`;

const SECTIONS: readonly LegalSectionData[] = [
  {
    id: "responsable",
    title: "Quién recaba y responde por tus datos",
    content: (
      <>
        <p>
          El responsable del tratamiento de tus datos personales es{" "}
          <strong>{BUSINESS.name}</strong>, herbolario establecido en{" "}
          {BUSINESS.address.street}, {BUSINESS.address.neighborhood},{" "}
          {BUSINESS.address.city}, {BUSINESS.address.state},{" "}
          {BUSINESS.address.country}.
        </p>
        <p>
          Para cualquier duda sobre esta política, sobre tus datos o para
          ejercer los derechos que aquí se describen, escríbenos a{" "}
          <a href={EMAIL_URL}>{BUSINESS.email}</a> o por WhatsApp al{" "}
          <a
            href={BUSINESS.whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {BUSINESS.whatsapp.display}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "datos",
    title: "Qué datos recabamos (y cuáles no)",
    content: (
      <>
        <p>
          Este sitio es una vitrina del herbolario: no vende en línea, no pide
          registro y no crea cuentas de usuario.
        </p>
        <p>
          Solo hay un formulario de contacto, y funciona así: escribes tu{" "}
          <strong>nombre</strong>, un <strong>teléfono</strong> (si quieres
          dejarlo, es opcional) y tu <strong>mensaje</strong>. Al enviarlo, el
          sitio arma ese texto y <strong>abre WhatsApp en tu propio
          dispositivo</strong> con el mensaje listo para que tú lo envíes.
          Tus datos no llegan a ningún servidor nuestro: no guardamos ese
          formulario, porque no tenemos dónde guardarlo.
        </p>
        <p>
          Si te comunicas directamente por WhatsApp, teléfono o correo, también
          tratamos lo que tú mismo nos compartas en esa conversación (tu
          nombre, tu número, tus dudas o pedidos), únicamente para atenderte.
        </p>
        <p>
          No pedimos datos de tarjetas ni cuentas bancarias, no pedimos
          contraseñas y no recabamos información sensible (salud, creencias,
          origen étnico o cualquier otra protegida por la ley).
        </p>
      </>
    ),
  },
  {
    id: "finalidades",
    title: "Para qué usamos tus datos",
    content: (
      <>
        <p>Usamos los datos que nos compartes para:</p>
        <ul>
          <li>
            Responder tus consultas, dudas y pedidos de información sobre
            productos del herbolario.
          </li>
          <li>
            Dar seguimiento, por WhatsApp o correo, a los productos o encargos
            que nos pidas por esos canales.
          </li>
          <li>
            Atenderte mejor en la tienda física cuando nos digas qué buscabas.
          </li>
          <li>Cumplir obligaciones legales, cuando la ley nos lo exija.</li>
        </ul>
        <p>
          Y para lo que <strong>no</strong> los usamos: no hacemos publicidad
          con ellos, no armamos perfiles, no los vendemos, no tomamos
          decisiones automatizadas y no enviamos boletines.
        </p>
      </>
    ),
  },
  {
    id: "transferencias",
    title: "Con quién compartimos tus datos",
    content: (
      <>
        <p>
          No vendemos, rentamos ni cedemos tus datos personales a terceros.
        </p>
        <p>
          Cuando nos escribes por WhatsApp o correo, esas plataformas tratan lo
          necesario para entregar tus mensajes, conforme a sus propias
          políticas de privacidad. Nosotros solo usamos esos canales en
          conversaciones que tú inicias.
        </p>
        <p>
          También podríamos compartir información si una autoridad competente
          nos lo exige conforme a la ley; fuera de eso, no hay transferencias.
        </p>
      </>
    ),
  },
  {
    id: "conservacion",
    title: "Dónde viven tus datos y por cuánto tiempo",
    content: (
      <>
        <p>
          Este sitio no tiene base de datos propia: no hay un servidor nuestro
          registrando visitas con identificación personal ni guardando lo que
          se escribe en el formulario.
        </p>
        <p>
          Las conversaciones que tú inicias quedan en el historial de WhatsApp
          o en el correo del negocio, como en cualquier chat. Si quieres que
          borremos una conversación o un correo con tus datos, pídenoslo por
          cualquiera de los canales de contacto y lo haremos.
        </p>
      </>
    ),
  },
  {
    id: "derechos-arco",
    title: "Tus derechos (ARCO) y cómo ejercerlos",
    content: (
      <>
        <p>
          Tienes derecho de <strong>acceso</strong> (saber qué datos tuyos
          tenemos), <strong>rectificación</strong> (corregirlos),{" "}
          <strong>cancelación</strong> (que los borremos) y{" "}
          <strong>oposición</strong> (que dejemos de usarlos). También puedes
          retirar tu consentimiento en cualquier momento, sin que ello afecte
          el tratamiento hecho antes de tu solicitud.
        </p>
        <p>Para ejercerlos:</p>
        <ol>
          <li>
            Manda un correo a <a href={EMAIL_URL}>{BUSINESS.email}</a> (o un
            mensaje de WhatsApp al {BUSINESS.whatsapp.display}) con tu nombre,
            el derecho que quieres ejercer y el detalle de tu solicitud.
          </li>
          <li>
            Te responderemos por el mismo canal en un plazo razonable; si
            necesitamos más tiempo o algún dato adicional para localizar tu
            información, te lo haremos saber.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies y tecnologías similares",
    content: (
      <p>
        Hoy este sitio <strong>no utiliza cookies</strong> de análisis ni de
        publicidad: solo las funciones técnicas esenciales del navegador para
        que las páginas funcionen. El detalle completo está en la{" "}
        <Link href="/cookies">política de cookies</Link>.
      </p>
    ),
  },
  {
    id: "marco-legal",
    title: "Marco legal",
    content: (
      <p>
        Esta política se emite conforme a la <strong>Ley Federal de Protección
        de Datos Personales en Posesión de los Particulares</strong>, publicada
        en el Diario Oficial de la Federación el 20 de marzo de 2025 (que
        sustituyó a la ley previa de 2010), y demás normativa mexicana
        aplicable en materia de protección de datos personales.
      </p>
    ),
  },
  {
    id: "cambios",
    title: "Cambios a esta política",
    content: (
      <p>
        Podemos actualizar esta política — por ejemplo, si cambian nuestros
        canales de contacto, agregamos herramientas al sitio o cambia la ley.
        Siempre publicaremos la versión vigente en esta página con su fecha de
        actualización; los cambios surten efecto desde que se publican aquí.
      </p>
    ),
  },
];

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Preferimos explicarte las cosas sin rodeos: aquí te contamos qué información tocamos cuando visitas este sitio o te comunicas con nosotros, para qué la usamos, con quién se comparte y cómo puedes pedir que se corrija o se borre."
      updated="30 de octubre de 2026"
      sections={SECTIONS}
    />
  );
}
