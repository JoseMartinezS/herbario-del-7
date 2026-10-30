import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El logotipo y las ilustraciones del catálogo son SVG propios servidos
    // desde /public (mismo origen), así que se permite su paso por el
    // optimizador de next/image. La CSP neutraliza cualquier script embebido.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
