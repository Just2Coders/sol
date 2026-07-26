import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Los dos son barriles grandes que se importan por nombre desde media app.
    // `reicon-react` reexporta 2674 iconos, así que sin esto cada import de uno
    // arrastra el módulo entero en dev; `radix-ui` es el paquete paraguas que
    // reexporta todos los `@radix-ui/react-*`, y de él salen los primitivos de
    // `components/ui` (select, sheet, dialog…).
    optimizePackageImports: ["reicon-react", "radix-ui"],
  },
  images: {
    remotePatterns: [
      // Imágenes de productos y kits subidas a Vercel Blob. El subdominio
      // depende del store, de ahí el comodín.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
