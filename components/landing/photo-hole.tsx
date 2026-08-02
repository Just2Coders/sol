import { cn } from "@/lib/utils";

/**
 * El hueco de una foto que todavía no existe.
 *
 * La home vende un objeto físico de cuatro cifras y hoy tiene una sola imagen
 * en toda la página. El diseño coloca fotografía donde hará falta, pero el
 * hueco no se rellena con banco de imágenes: una instalación de mentira dentro
 * de la sección de confianza es exactamente el engaño que esa sección viene a
 * evitar. Así que el hueco se dibuja como hueco —superficie apagada y el rótulo
 * entre corchetes de lo que va dentro— hasta que el proveedor mande la suya.
 *
 * Cuando lleguen las fotos, este componente se sustituye por un `next/image`
 * con el mismo encuadre y las mismas medidas; nada de quien lo usa cambia.
 */
export function PhotoHole({
  label,
  align = "center",
  className,
}: {
  label: string;
  /** Centrado en las fichas; al pie en los planos grandes de la sección de confianza. */
  align?: "center" | "bottom";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted relative flex",
        align === "center"
          ? "items-center justify-center px-6 text-center"
          : "items-end p-4",
        className,
      )}
    >
      <span className="text-marginalia tracking-mono-lg text-muted-foreground font-mono uppercase">
        {label}
      </span>
    </div>
  );
}
