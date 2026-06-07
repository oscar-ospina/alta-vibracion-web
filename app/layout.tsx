import type { Metadata } from "next";
import { Archivo, Open_Sans } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/layout/top-bar";
import { Footer } from "@/components/layout/footer";
import { WhatsappFab } from "@/components/layout/whatsapp-fab";

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
      <body className="flex min-h-dvh flex-col">
        {/* WCAG 2.4.1 Bypass Blocks — skip the persistent TopBar via keyboard. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-ring"
        >
          Saltar al contenido
        </a>
        <TopBar />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer />
        <WhatsappFab />
      </body>
    </html>
  );
}
