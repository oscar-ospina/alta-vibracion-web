import type { Metadata } from "next";
import { Archivo, Open_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted at build time, wired to the variable names @saas/ui's theme expects
// (--font-archivo → --font-display, --font-open-sans → --font-sans).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://altavibracion.example"),
  title: {
    default: "Alta Vibración — Numerología con Liliana Tobón",
    template: "%s · Alta Vibración",
  },
  description:
    "Conecta con tu esencia a través de los números. Consultas de numerología con Liliana Tobón. No es casualidad. Es vibración.",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Alta Vibración",
    title: "Alta Vibración — Numerología con Liliana Tobón",
    description: "No es casualidad. Es vibración.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CO"
      className={`${archivo.variable} ${openSans.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
