import { ImageResponse } from "next/og";

/**
 * Imagen Open Graph del sitio (1200 × 630), aplicada por Next.js a todas
 * las páginas que no declaran la suya. Se genera en tiempo de build con
 * tipografía del sistema (la que next/og trae embebida): no se descargan
 * fuentes externas.
 *
 * Diseño: la misma etiqueta de botánica del hero — marco de doble filete
 * dorado sobre crema, nombre en verde profundo y brote dorado como
 * fleurón — para que el enlace compartido se reconozca como el sitio.
 */

export const alt =
  "Herbario Del 7 — Herbolaria y productos esotéricos y naturistas en Frontera, Coahuila";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Colores de la identidad (mismos valores que app/globals.css). */
const COLORS = {
  cream: "#faf7f2",
  greenDeep: "#163023",
  greenBody: "rgba(22, 48, 35, 0.8)",
  terracotta: "#a75f2c",
  gold: "#d9a441",
  goldDeep: "#c08d31",
} as const;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.cream,
          padding: 28,
        }}
      >
        {/* Filete exterior del marco */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            border: `3px solid rgba(192, 141, 49, 0.65)`,
            borderRadius: 28,
            padding: 10,
          }}
        >
          {/* Filete interior del marco + contenido centrado */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
              width: "100%",
              height: "100%",
              border: `1.5px solid rgba(192, 141, 49, 0.45)`,
              borderRadius: 20,
              padding: "48px 72px",
            }}
          >
            <p
              style={{
                display: "flex",
                margin: 0,
                fontSize: 26,
                letterSpacing: 6,
                color: COLORS.terracotta,
              }}
            >
              HERBOLARIA TRADICIONAL
            </p>
            <p
              style={{
                display: "flex",
                margin: 0,
                fontSize: 110,
                fontWeight: 700,
                letterSpacing: -1,
                textAlign: "center",
                color: COLORS.greenDeep,
              }}
            >
              Herbario Del 7
            </p>
            {/* Fleurón: filete — rombo dorado — filete, como SprigDivider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 160,
                  height: 2,
                  backgroundColor: COLORS.goldDeep,
                }}
              />
              <svg width={22} height={22} viewBox="0 0 22 22">
                <rect
                  x="6"
                  y="6"
                  width="10"
                  height="10"
                  fill={COLORS.gold}
                  transform="rotate(45 11 11)"
                />
              </svg>
              <div
                style={{
                  display: "flex",
                  width: 160,
                  height: 2,
                  backgroundColor: COLORS.goldDeep,
                }}
              />
            </div>
            <p
              style={{
                display: "flex",
                margin: 0,
                fontSize: 34,
                lineHeight: 1.4,
                textAlign: "center",
                color: COLORS.greenBody,
              }}
            >
              Hierbas, veladoras y preparados con asesoría tradicional
            </p>
            <p
              style={{
                display: "flex",
                margin: 0,
                fontSize: 28,
                fontWeight: 500,
                color: COLORS.terracotta,
              }}
            >
              Frontera, Coahuila, México
            </p>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
