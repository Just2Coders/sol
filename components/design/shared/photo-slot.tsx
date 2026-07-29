import { cn } from "@/lib/utils";

/**
 * El hueco de una foto que todavía no existe.
 *
 * La landing vende un objeto físico de cuatro cifras con una sola imagen en
 * toda la página, así que las tres exploraciones colocan fotografía donde hará
 * falta. Pero no se rellena con fotos de archivo: una instalación de mentira en
 * una sección de confianza es exactamente el engaño que la sección viene a
 * evitar. Así que el hueco se dibuja como hueco —aspa, filete discontinuo y el
 * rótulo de lo que va dentro— y se queda así hasta que el proveedor mande la
 * suya.
 *
 * El color lo pone el llamante con `text-*` y `border-*`: el aspa se dibuja en
 * `currentColor`, de modo que la pieza no conoce ningún tono.
 */
export function PhotoSlot({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-end overflow-hidden border border-dashed p-4",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full opacity-20"
      >
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="text-marginalia relative font-mono">{label}</span>
    </div>
  );
}
