import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Catálogo — Solaris",
  description: "Kits solares de proveedores verificados en tu provincia.",
};

/**
 * Marcador de posición del catálogo (Etapa 5 del PLAN).
 *
 * Existe para que los CTA "Explora los kits" del hero tengan destino real en
 * vez de un 404. Se reemplaza por el catálogo cuando llegue su etapa.
 */
export default function CatalogPage() {
  return (
    <main className="px-gutter py-section-md flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <span className="text-muted-foreground text-label font-mono">
        catálogo · en construcción
      </span>
      <h1 className="text-heading-1 max-w-[16ch]">Estamos armando los kits.</h1>
      <p className="text-muted-foreground text-body max-w-[50ch]">
        Muy pronto vas a poder comparar kits de distintos proveedores, ver
        cuántas horas de respaldo te da cada uno y coordinar la instalación en
        tu provincia.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
