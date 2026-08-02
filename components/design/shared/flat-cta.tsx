import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * El CTA de las exploraciones de landing.
 *
 * No es el `Button` de la librería, y esa es la decisión: el botón de shadcn
 * mide 36 px de alto, redondea a 4 px y escribe en text-sm; debajo de un
 * titular de portada se lee como un control de formulario, no como la puerta de
 * entrada al producto. Las dos referencias de la auditoría lo resuelven igual —
 * campo ancho, bajo, sin radio y con la etiqueta en caja alta espaciada— así
 * que la anatomía es fija en las tres variantes y lo único que cambia es el
 * tono. Radio 0 sin excepción: es el valor más intercambiable de la página.
 *
 * El padding vertical es asimétrico a propósito: las versalitas no tienen
 * descendentes, así que centrarlas por la caja las deja ópticamente bajas.
 */

export type CtaTone = "primary" | "loud" | "inverse" | "outline";

const TONE: Record<CtaTone, string> = {
  // Campo sólido de acción, el tono base del sistema.
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  // El acento hipersaturado, reservado en exclusiva a la acción.
  loud: "bg-primary-loud text-primary-loud-foreground hover:bg-primary-loud-hover",
  // Sobre superficie oscura o sobre el terracota sólido: el campo se invierte.
  inverse: "bg-card text-primary hover:bg-background",
  // Acción secundaria: solo el filete, sin campo.
  outline:
    "border border-current text-primary hover:bg-primary hover:text-primary-foreground",
};

const BASE =
  "text-button ease-standard inline-flex items-center justify-center rounded-none px-12 pt-4 pb-3.5 text-center uppercase tracking-mono-mid transition-colors duration-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export function flatCtaClass(tone: CtaTone = "primary", className?: string) {
  return cn(BASE, TONE[tone], className);
}

export function FlatCta({
  href,
  tone = "primary",
  className,
  children,
}: {
  href: string;
  tone?: CtaTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={flatCtaClass(tone, className)}>
      {children}
    </Link>
  );
}
