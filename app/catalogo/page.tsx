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
export default function CatalogoPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-[var(--space-section-x)] py-[var(--space-section-y-md)] text-center">
      <span className="text-tinta-suave font-mono text-[length:var(--text-label-size)] tracking-[var(--text-label-tracking)]">
        catálogo · en construcción
      </span>
      <h1 className="max-w-[16ch] text-[length:var(--text-heading-1-size)] leading-[var(--text-heading-1-leading)] font-bold tracking-[var(--text-heading-1-tracking)]">
        Estamos armando los kits.
      </h1>
      <p className="text-tinta-suave max-w-[50ch] text-[length:var(--text-body-size)] leading-[var(--text-body-leading)]">
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
