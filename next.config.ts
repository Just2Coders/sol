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
};

export default nextConfig;
