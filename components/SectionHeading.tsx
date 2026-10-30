interface SectionHeadingProps {
  title: string;
  /** Frase de apoyo bajo el título (opcional). */
  intro?: string;
  /** Fondo sobre el que vive la sección. */
  tone?: "cream" | "green";
}

/**
 * Encabezado de sección: título en serif display + frase de apoyo.
 * Alineado a la izquierda y con `max-w` para cuidar la medida de línea.
 */
export default function SectionHeading({
  title,
  intro,
  tone = "cream",
}: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <h2
        className={`font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl ${
          tone === "green" ? "text-cream" : "text-green-800"
        }`}
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={`mt-3 text-pretty text-base leading-relaxed sm:text-lg ${
            tone === "green" ? "text-cream/80" : "text-green-800/75"
          }`}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
