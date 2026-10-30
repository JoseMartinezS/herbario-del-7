import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import JsonLd from "@/components/JsonLd";
import { BUSINESS } from "@/content/business";

/** Serif display: Fraunces con ejes ópticos y de suavidad. */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

/** Sans de cuerpo: Inter. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://herbariodel7.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BUSINESS.name} | Herbolaria en Frontera, Coahuila`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: BUSINESS.description,
  openGraph: {
    title: `${BUSINESS.name} | Herbolaria en Frontera, Coahuila`,
    description: BUSINESS.description,
    locale: "es_MX",
    type: "website",
    url: "/",
    siteName: BUSINESS.name,
  },
  icons: {
    icon: [{ url: "/images/logo.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}>
        <JsonLd />
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-green-800 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-cream focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido">{children}</main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
