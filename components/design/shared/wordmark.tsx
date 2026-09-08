import { cn } from "@/lib/utils";

/**
 * La marca dibujada a escala de cartel y recortada por los dos bordes del
 * viewport.
 *
 * Es el gesto que le faltaba a la home: hoy la foto del hero es lo único que
 * cruza el gutter, y sin nada que se salga del margen la página se lee como una
 * pila de bloques dentro de la misma caja. Las dos referencias de la auditoría
 * cierran así, y el recorte es la mitad del efecto — si la palabra cupiera
 * entera sería un titular más.
 *
 * Va en un flex centrado con la palabra sin encoger: eso reparte el desborde a
 * los dos lados en vez de dejarlo todo a la derecha. `text-wordmark` mide en vw
 * justamente para que siempre desborde, a cualquier ancho de pantalla.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex justify-center overflow-hidden", className)}>
      <span className="text-wordmark shrink-0 leading-none whitespace-nowrap">
        SOLARIS
      </span>
    </div>
  );
}
