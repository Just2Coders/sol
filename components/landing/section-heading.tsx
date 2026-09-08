import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/**
 * La entrada de una sección de la home: antetítulo mono, titular y una línea de
 * cuerpo, con la salida lateral —cuando la hay— alineada a la última línea del
 * bloque.
 *
 * Es lo único que se repite literalmente entre secciones, así que vive aquí: si
 * mañana el antetítulo deja de ir en caja alta, se cambia en un sitio y la
 * página entera obedece.
 */
export function SectionHeading({
  eyebrow,
  title,
  body,
  action,
  titleClassName,
  className,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  /** La salida lateral de la sección, alineada abajo con el bloque de texto. */
  action?: React.ReactNode;
  /** Para subir el titular un peldaño en la sección que abre la página. */
  titleClassName?: string;
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col items-start justify-between gap-8 md:flex-row md:items-end",
        className,
      )}
    >
      <div className="flex max-w-155 flex-col gap-3.5">
        {/* <p className="text-label tracking-mono-lg text-foreground font-mono uppercase">
          {eyebrow}
        </p> */}
        <h2 className={cn("text-display-3 text-foreground", titleClassName)}>
          {title}
        </h2>
        {body && <p className="text-body text-foreground max-w-112">{body}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}
