import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `reicon-react` exporta 2674 iconos desde un solo barrel: sin esto, cada
  // import de un icono arrastra el módulo entero en dev.
  experimental: {
    optimizePackageImports: ["reicon-react"],
  },
};

export default nextConfig;
