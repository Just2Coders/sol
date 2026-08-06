import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Display y cuerpo. Los pesos son los que usa la escala tipográfica del sistema.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Labels, marginalia y datos técnicos.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  // Base de las URLs relativas de metadata (canonical y Open Graph). En local
  // cae a localhost; en Vercel se define NEXT_PUBLIC_SITE_URL con el dominio.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Solaris — Paneles solares y kits de energía",
  description:
    "Compra paneles solares y kits de energía de proveedores que operan en tu zona.",
  openGraph: {
    siteName: "Solaris",
    locale: "es_CU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${spaceMono.variable} h-full antialiased`}
    >
      {/* Las extensiones del navegador escriben en el `<body>` antes de que
          React hidrate (ColorZilla le cuelga `cz-shortcut-listen`, los gestores
          de contraseñas y los traductores hacen lo suyo), y ese atributo de más
          rompe la comparación con el HTML del servidor. No es algo que la app
          pueda evitar ni arreglar: se silencia aquí, que solo afecta a los
          atributos de este elemento —un nivel, no el árbol— así que cualquier
          descuadre real de dentro se sigue viendo. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
