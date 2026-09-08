import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * El botón de la home.
 *
 * No es el `Button` de la librería y esa es la decisión: el botón de shadcn
 * mide 36 px, redondea a 4 px y escribe en text-sm; debajo de un titular de
 * portada se lee como un control de formulario, no como la puerta de entrada al
 * producto. Aquí la anatomía es campo ancho, bajo, sin radio y la etiqueta en
 * caja alta espaciada. El `Button` sigue siendo el de las pantallas de trabajo
 * (catálogo, cuenta, admin), donde sí es un control.
 *
 * El padding vertical es asimétrico a propósito: las versalitas no tienen
 * descendentes, así que centrarlas por la caja las deja ópticamente bajas.
 *
 * Tono y tamaño son ejes separados: el mismo `loud` aparece a tamaño de hero,
 * de barra y de ficha de equipo — `ink` queda para una acción secundaria que
 * necesita seguir siendo un campo sólido sin competir con la principal.
 */

export type CtaTone = "loud" | "ink" | "outline";
export type CtaSize = "sm" | "md" | "lg";

const TONE: Record<CtaTone, string> = {
  // El acento hipersaturado, reservado en exclusiva a la acción principal.
  loud: "bg-primary-loud text-primary-loud-foreground hover:bg-primary-loud-hover",
  // Campo de tinta: la acción que no compite con la principal pero sigue siendo
  // un campo sólido.
  ink: "bg-foreground text-background hover:bg-primary-loud hover:text-primary-loud-foreground",
  // Secundaria: fondo de página, filete y un oscurecido leve al pasar por
  // encima — el mismo comportamiento que las pestañas sin seleccionar del
  // buscador de kits y que el `outline` de la librería de componentes. Nunca
  // se llena de acento: eso es lo que la deja fuera de la competencia con `loud`.
  outline:
    "bg-background border border-foreground text-foreground hover:bg-muted",
};

const SIZE: Record<CtaSize, string> = {
  sm: "text-marginalia tracking-mono-sm px-4 pt-2.5 pb-2",
  md: "text-label tracking-mono-md px-6 pt-3.5 pb-3",
  lg: "text-data tracking-mono-md px-10 pt-4 pb-3.5",
};

const BASE =
  "ease-standard focus-visible:ring-ring inline-flex items-center justify-center rounded-none text-center font-mono uppercase transition-colors duration-base focus-visible:ring-2 focus-visible:outline-none";

export function flatCtaClass(
  tone: CtaTone = "loud",
  size: CtaSize = "lg",
  className?: string,
) {
  return cn(BASE, TONE[tone], SIZE[size], className);
}

export function FlatCta({
  href,
  tone = "loud",
  size = "lg",
  className,
  children,
}: {
  href: string;
  tone?: CtaTone;
  size?: CtaSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={flatCtaClass(tone, size, className)}>
      {children}
    </Link>
  );
}
