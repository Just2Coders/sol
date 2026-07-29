import Image from "next/image";
import { Sun2 } from "reicon-react";

import { cn } from "@/lib/utils";

type CatalogMediaProps = {
  src: string | null;
  alt: string;
  /** `sizes` de next/image: obligatorio porque la foto siempre va con `fill`. */
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * Foto de un producto o kit, con su hueco cuando el proveedor aún no cargó
 * ninguna: superficie muted y el sol de la marca, nunca un roto.
 *
 * Va `unoptimized` a propósito. Hoy las imágenes son URLs que el admin pega a
 * mano (la subida a Blob es lo que queda pendiente de la Etapa 4), así que
 * pueden venir de cualquier host: optimizarlas obligaría a abrir
 * `images.remotePatterns` a dominios arbitrarios, que es un proxy de imágenes
 * abierto. Cuando las fotos vivan en Blob se quita esta prop y se añade ese
 * único host a la config.
 */
export function CatalogMedia({
  src,
  alt,
  sizes,
  className,
  priority,
}: CatalogMediaProps) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={cn(
          "bg-muted flex items-center justify-center overflow-hidden",
          className,
        )}
      >
        <Sun2 aria-hidden className="text-support-strong size-8" />
      </div>
    );
  }

  return (
    <div className={cn("bg-muted relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
