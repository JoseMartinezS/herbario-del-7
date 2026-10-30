import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/content/business";
import SectionHeading from "@/components/SectionHeading";
import SprigDivider from "@/components/SprigDivider";
import { IconChat, IconLeaf, IconShield, IconSprig, IconWhatsApp } from "@/components/icons";

export const metadata: Metadata = {
  title: "Nosotros",
  description: `Conoce la historia y los valores de ${BUSINESS.name}, un herbolario de barrio en Frontera, Coahuila.`,
};

// TODO: reemplazar con la historia real del negocio (años de apertura,
// quiénes lo fundaron, anécdotas del mostrador). Lo siguiente es texto
// plausible de arranque, no dato verificado.
const HISTORY_PARAGRAPHS = [
  "Herbario Del 7 nació en Frontera con una idea sencilla: que en la región no faltara un lugar donde encontrar la hierba correcta, la veladora adecuada y el consejo de siempre. Empezamos con un mostrador chico, pocos frascos y muchas ganas de servir bien.",
  "Aquí la herbolaria se vive como se hereda: de boca en boca, entre recetas de té para calmar el día, aguas de riego para limpiar la casa y sahumerios de copal para empezar la semana. Lo que no sabemos, lo averiguamos; lo que sabemos, lo compartimos.",
  "Hoy seguimos siendo un herbolario de mostrador: te recibimos, te preguntamos qué buscas y te vamos orientando hasta dar con ello. Sin prisa y sin rodeos, como se atiende a la gente del barrio.",
] as const;

const VALUES = [
  {
    icon: IconSprig,
    name: "Tradición herbolaria",
    description:
      "El conocimiento de las plantas de la herbolaria mexicana que se hereda de generación en generación.",
  },
  {
    icon: IconLeaf,
    name: "Calidad natural",
    description:
      "Hierbas frescas, preparados hechos con cuidado y productos seleccionados uno por uno.",
  },
  {
    icon: IconChat,
    name: "Atención personalizada",
    description:
      "Te escuchamos primero: cada intención tiene su contexto y cada casa tiene su costumbre.",
  },
  {
    icon: IconShield,
    name: "Confianza",
    description:
      "Trato de barrio: precios claros, consejo honesto y la misma cara de siempre.",
  },
] as const;

// TODO: reemplazar con las personas reales del equipo (nombre, rol y foto
// cuando estén disponibles).
const TEAM = [
  {
    name: "Atención en mostrador",
    description:
      "El equipo de la casa te recibe y te acompaña hasta encontrar lo que buscas.",
  },
  {
    name: "Asesoría herbolaria",
    description:
      "Pregúntanos por hierbas, preparados y su uso tradicional: con gusto te orientamos.",
  },
] as const;

export default function NosotrosPage() {
  return (
    <>
      {/* Encabezado de página */}
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance text-green-800 sm:text-5xl">
          Nosotros
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-green-800/80">
          Un herbolario de barrio en Frontera, Coahuila: esto quiénes somos y lo
          que nos mueve.
        </p>
      </header>

      {/* Historia */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
        <SprigDivider className="mb-10 w-44" />
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
          <div>
            <SectionHeading title="Un herbolario de barrio, de los de antes" />
            <div className="mt-6 flex max-w-prose flex-col gap-5 text-pretty text-base leading-relaxed text-green-800/85">
              {HISTORY_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
          </div>
          <figure className="flex items-center justify-center">
            <blockquote className="rounded-2xl border-2 border-gold-600/60 p-1.5">
              <p className="rounded-xl px-6 py-8 text-center font-display text-xl font-medium italic leading-relaxed text-green-800 ring-1 ring-inset ring-gold-600/40 sm:px-10 sm:text-2xl">
                “La hierba correcta, la veladora adecuada y el consejo de
                siempre.”
              </p>
            </blockquote>
          </figure>
        </div>
      </section>

      {/* Valores */}
      <section className="border-y border-sand/60 bg-cream-dark/50 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Lo que nos mueve"
            intro="Cuatro principios que se notan en cada recomendación del mostrador."
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: ValueIcon, name, description }) => (
              <li key={name}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-sand bg-white/70 p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <ValueIcon className="h-5.5 w-5.5" />
                  </span>
                  <h3 className="font-display text-lg font-semibold text-green-800">
                    {name}
                  </h3>
                  <p className="text-pretty text-sm leading-relaxed text-green-800/70">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Equipo */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <SprigDivider className="mb-10 w-44" />
        <SectionHeading
          title="Quién te atiende"
          intro="Detrás del mostrador siempre hay quien te conozca por tu nombre."
        />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
          {TEAM.map((member) => (
            <li key={member.name}>
              <div className="flex h-full items-start gap-4 rounded-xl border border-sand bg-white/70 p-5">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-500/50 bg-cream-dark text-gold-700"
                >
                  <IconSprig className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-green-800">
                    Equipo {BUSINESS.name}: {member.name}
                  </h3>
                  <p className="mt-1.5 text-pretty text-sm leading-relaxed text-green-800/70">
                    {member.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="bg-green-900 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-xl font-display text-2xl font-semibold text-balance text-cream sm:text-3xl">
            Conócenos en persona
          </h2>
          <p className="mx-auto mt-4 max-w-prose text-pretty text-base leading-relaxed text-cream/80">
            Ven por el mostrador, escríbenos o date una vuelta por el catálogo
            antes de venir por algo en particular.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center rounded-full bg-gold-400 px-6 py-3.5 text-base font-semibold text-green-900 shadow-md transition-colors hover:bg-gold-300"
            >
              Ver el catálogo
            </Link>
            <a
              href={BUSINESS.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-cream/70 px-6 py-3 text-base font-semibold text-cream transition-colors hover:bg-cream hover:text-green-900"
            >
              <IconWhatsApp className="h-5 w-5" />
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
