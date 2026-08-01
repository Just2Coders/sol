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
  /**
   * Imprime la foto en el duotono de la paleta y la destapa a color cuando el
   * cursor entra en su tarjeta.
   *
   * **Lo tiene que activar un ancestro marcado con `group`** — el disparador no
   * es la foto, es la pieza entera que la contiene (la celda enlazada de la
   * grilla, la figura de la ficha), porque revelar el color solo al pasar por
   * encima del recorte y no del nombre sería una zona muerta.
   *
   * Fuera de sitio en un thumbnail chico (el carrito): a 64px el duotono no se
   * lee como intención, se lee como una foto en mal estado.
   */
  duotone?: boolean;
};

/**
 * Foto de un producto o kit, con su hueco cuando el proveedor aún no cargó
 * ninguna: superficie muted y el sol de la marca, nunca un roto.
 *
 * ## El duotono
 *
 * Las fotos las trae cada proveedor, así que una grilla mezcla estudio con
 * fondo blanco, render y foto de obra: seis fuentes que no comparten luz ni
 * encuadre. Con `duotone` la foto pasa a grises y dos capas la vuelven a
 * colorear contra la paleta, sin filtros de tono inventados. Cada una hace un
 * trabajo distinto y por eso **no** se van juntas:
 *
 * - **El papel** (`mix-blend-darken` con `--photo-highlight`) baja los blancos
 *   hasta el papel de la ficha: nada en la foto queda más claro. Es el truco
 *   que más se nota —el fondo blanco de estudio se funde con la hoja y el
 *   producto queda impreso sobre ella, sin recuadro— y es el que **se queda
 *   siempre**, también en hover y también en táctil. Recortar las altas luces
 *   no le quita color a nada: un cian o un rojo de producto pasan intactos,
 *   solo pierde el blanco de fondo, que no era información.
 * - **La sombra** (`mix-blend-lighten` con `--photo-shadow`) levanta los negros
 *   hasta el verde casi negro del lienzo: nada queda más oscuro. Junto al gris,
 *   comprime el rango tonal entre los dos extremos y la pared entera se lee
 *   como un catálogo impreso. Esta capa **sí** se levanta en hover, y con ella
 *   el gris: el color real del producto, que es lo que informa, está a un
 *   cursor de distancia sin que vuelva el recuadro blanco.
 *
 * Por eso el duotono solo se monta donde hay cursor para deshacerlo
 * (`pointer-fine`): en una pantalla táctil no hay hover, y dejar al comprador
 * con un producto teñido que no puede ver de verdad sería cambiar información
 * por decoración. El papel, que no esconde nada, no necesita esa excusa.
 *
 * Va `unoptimized` a propósito, y sigue haciendo falta aunque el store de Blob
 * ya esté montado y su host declarado en `images.remotePatterns`: el uploader
 * del admin admite **además** pegar una URL externa, así que una foto todavía
 * puede venir de cualquier sitio. Optimizarlas obligaría a abrir la config a
 * dominios arbitrarios, que es un proxy de imágenes abierto. Esta prop se cae
 * el día que la foto pegada a mano deje de aceptarse, no antes.
 */
export function CatalogMedia({
  src,
  alt,
  sizes,
  className,
  priority,
  duotone,
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
    <div
      className={cn(
        "bg-muted relative overflow-hidden",
        // `isolate`: las capas de mezcla tienen que quedarse dentro de la foto.
        // Sin contexto de apilamiento propio mezclarían con lo que hay debajo en
        // la página —la superficie de la celda, la línea de la retícula.
        duotone && "isolate",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        priority={priority}
        className={cn(
          "object-cover",
          duotone &&
            "ease-standard transition duration-slow pointer-fine:grayscale pointer-fine:group-hover:grayscale-0 pointer-fine:group-focus-visible:grayscale-0 motion-reduce:transition-none",
        )}
      />

      {duotone && (
        <>
          {/* La sombra: se levanta con el gris y solo existe donde hay cursor. */}
          <span
            aria-hidden
            className="bg-photo-shadow ease-standard pointer-events-none absolute inset-0 transition-opacity duration-slow mix-blend-lighten group-hover:opacity-0 group-focus-visible:opacity-0 pointer-coarse:hidden motion-reduce:transition-none"
          />
          {/* El papel: se queda puesto en todos los estados. */}
          <span
            aria-hidden
            className="bg-photo-highlight pointer-events-none absolute inset-0 mix-blend-darken"
          />
        </>
      )}
    </div>
  );
}
