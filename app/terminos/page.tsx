import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import LegalPage, { type LegalSectionData } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Condiciones de uso del sitio de ${BUSINESS.name}: catálogo informativo sin compras en línea, precios referenciales en pesos mexicanos, atención por WhatsApp o en tienda y avisos de salud.`,
};

const SECTIONS: readonly LegalSectionData[] = [
  {
    id: "naturaleza",
    title: "Sobre este sitio y su naturaleza",
    content: (
      <>
        <p>
          {BUSINESS.name} publica este sitio para mostrar quiénes somos, qué
          solemos tener en el herbolario y dónde y cuándo encontrarnos. Es un
          sitio <strong>informativo y de catálogo</strong>.
        </p>
        <p>
          No es una tienda en línea: no hay carrito de compras, no hay pagos
          electrónicos y no se puede cerrar ninguna compra desde aquí. Las
          condiciones de cada compra o encargo se acuerdan directamente con el
          personal del herbolario por los canales de contacto o en la tienda.
        </p>
      </>
    ),
  },
  {
    id: "productos",
    title: "Productos, precios y disponibilidad",
    content: (
      <>
        <p>
          El catálogo es <strong>referencial</strong>: muestra una selección de
          lo que suele haber en mostrador, y la existencia real de cada
          producto cambia día a día. Lo que se muestra aquí no garantiza que
          haya stock al momento de tu visita.
        </p>
        <p>
          Los precios se expresan en <strong>pesos mexicanos (MXN)</strong>.
          Los precios publicados hoy en el sitio son cifras de{" "}
          <strong>referencia</strong> y pueden cambiar en cualquier momento y
          sin previo aviso: el precio final de un producto se confirma al
          momento de tu pedido, por WhatsApp, por teléfono o en la tienda.
        </p>
        <p>
          Las ilustraciones del catálogo son representativas; la presentación
          real del producto (empaque, tamaño, color) puede variar.
        </p>
      </>
    ),
  },
  {
    id: "compras",
    title: "Cómo comprar y cómo te atendemos",
    content: (
      <>
        <p>
          Las compras, apartados y encargos se gestionan directamente con el
          personal del herbolario a través de estos canales:
        </p>
        <ul>
          <li>
            <strong>WhatsApp:</strong>{" "}
            <a
              href={BUSINESS.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {BUSINESS.whatsapp.display}
            </a>{" "}
            (número distinto al de llamadas).
          </li>
          <li>
            <strong>Teléfono:</strong>{" "}
            <a href={`tel:${BUSINESS.phone.tel}`}>{BUSINESS.phone.display}</a>.
          </li>
          <li>
            <strong>Tienda física:</strong> {BUSINESS.address.street},{" "}
            {BUSINESS.address.neighborhood}, {BUSINESS.address.city},{" "}
            {BUSINESS.address.state}, dentro del horario publicado en la
            página de <Link href="/ubicacion">ubicación y horarios</Link>.
          </li>
        </ul>
        <p>
          Este sitio solo te acerca a esos canales: los acuerdos, pagos y
          entregas se hacen directamente con el personal, de persona a persona.
        </p>
      </>
    ),
  },
  {
    id: "salud",
    title: "Aviso importante sobre salud",
    content: (
      <>
        <p>
          Vendemos productos de la <strong>herbolaria y la tradición
          mexicana</strong>: hierbas, tés y preparados, veladoras, aguas de
          riego, lociones, cápsulas y suplementos. El uso que se describe para
          estos productos proviene de la tradición popular y del uso
          tradicional que se hereda de generación en generación.
        </p>
        <p>
          <strong>Nada de lo mostrado en este sitio, ni el consejo que se da en
          el mostrador, sustituye el diagnóstico, el tratamiento o la
          indicación de un profesional de la salud.</strong>
        </p>
        <p>
          Si tienes un padecimiento, estás embarazada o en lactancia, tomas
          medicamentos o vas a dar un producto a un niño, consulta primero a tu
          médico. Sigue las precauciones de la etiqueta de cada producto y, si
          presentas cualquier reacción, suspende su uso y busca atención
          médica.
        </p>
      </>
    ),
  },
  {
    id: "propiedad",
    title: "Propiedad intelectual",
    content: (
      <>
        <p>
          Los textos, la identidad gráfica, el logotipo y las ilustraciones de
          este sitio pertenecen a {BUSINESS.name} o a quienes los crearon para
          el negocio. Puedes compartir enlaces a nuestras páginas; para
          reutilizar o reproducir el contenido en otros medios, pídenos
          autorización por escrito.
        </p>
        <p>
          Las marcas, nombres y distintivos de terceros que puedan aparecer
          (por ejemplo, las redes sociales) pertenecen a sus respectivos
          titulares.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidad",
    title: "Limitación de responsabilidad",
    content: (
      <>
        <p>
          Publicamos la información de este sitio con cuidado, pero la
          ofrecemos tal como está: puede contener errores, datos
          desactualizados o cambios sin previo aviso (en especial en precios y
          existencias).
        </p>
        <p>
          No garantizamos resultados por el uso de los productos mostrados y no
          respondemos por decisiones tomadas únicamente con base en la
          información de este sitio. Para cualquier duda sobre un producto,
          pregunta directamente al personal del herbolario antes de adquirirlo
          o usarlo.
        </p>
      </>
    ),
  },
  {
    id: "terceros",
    title: "Enlaces a sitios de terceros",
    content: (
      <p>
        El sitio contiene enlaces a nuestras redes sociales y a Google Maps.
        Esos sitios tienen sus propios términos y políticas de privacidad, que
        no controlamos; revisa sus condiciones antes de usarlos. Nuestra{" "}
        <Link href="/privacidad">política de privacidad</Link> aplica solo a
        este sitio.
      </p>
    ),
  },
  {
    id: "ley",
    title: "Ley aplicable y jurisdicción",
    content: (
      <p>
        Estos términos y condiciones se rigen por las leyes de los Estados
        Unidos Mexicanos. Cualquier controversia derivada del uso de este
        sitio se resolverá ante los tribunales competentes conforme a dichas
        leyes.
      </p>
    ),
  },
  {
    id: "cambios",
    title: "Cambios y contacto",
    content: (
      <>
        <p>
          Podemos actualizar estos términos cuando el sitio o la forma de
          trabajar cambien. La versión vigente siempre estará publicada aquí,
          con su fecha de actualización.
        </p>
        <p>
          ¿Dudas sobre estos términos? Escríbenos a{" "}
          <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> o por
          WhatsApp al{" "}
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
];

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro="Estas condiciones dicen cómo funciona este sitio y qué esperar de él. En corto: es la vitrina de nuestro herbolario; para comprar, te atendemos por WhatsApp, por teléfono o en el mostrador de la tienda."
      updated="30 de octubre de 2026"
      sections={SECTIONS}
    />
  );
}
