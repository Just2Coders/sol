import { CatalogMedia } from "@/components/catalog/catalog-media";
import type { CatalogPhoto } from "@/lib/catalog/photos";

/**
 * La columna de fotos de una ficha.
 *
 * En escritorio es una tira vertical a sangre con su propio scroll: el cursor
 * decide qué columna se mueve, y los datos de la derecha no se van mientras se
 * recorren las fotos. En móvil la misma tira se acuesta y pasa a ser un carrusel
 * horizontal con imán, para que el precio no quede a cinco pantallas de scroll.
 *
 * No se hidrata nada: el paso de foto lo hace el navegador (`snap`) y el salto
 * desde la lista de componentes es un ancla de verdad, no JavaScript. Por eso
 * cada figura lleva `id`.
 */
export function CatalogPhotoColumn({
  photos,
  fallbackAlt,
}: {
  photos: CatalogPhoto[];
  /** Nombre del item, para el hueco cuando el proveedor no cargó ninguna foto. */
  fallbackAlt: string;
}) {
  if (photos.length === 0) {
    return (
      <div className="bg-muted">
        <CatalogMedia
          src={null}
          alt={fallbackAlt}
          sizes={PHOTO_SIZES}
          className="aspect-[4/5] lg:aspect-[3/4]"
        />
      </div>
    );
  }

  return (
    <div className="flex snap-x snap-mandatory scroll-smooth overflow-x-auto overscroll-contain motion-reduce:scroll-auto lg:block lg:h-full lg:min-h-0 lg:snap-y lg:overflow-x-hidden lg:overflow-y-auto">
      {photos.map((photo, index) => (
        <figure
          key={`${photo.src}-${index}`}
          id={photo.anchorId ?? undefined}
          // `group`: cada figura destapa su propia foto. Mientras se leen los
          // datos de la derecha la columna se queda en el duotono de la paleta,
          // y la foto que el cursor visita es la única que vuelve a color.
          className="group relative w-full shrink-0 snap-start"
        >
          <CatalogMedia
            src={photo.src}
            alt={photo.alt}
            sizes={PHOTO_SIZES}
            // Solo la primera entra en la primera pintada; las demás quedan
            // fuera de pantalla hasta que se recorre la columna.
            priority={index === 0}
            className="aspect-[4/5] lg:aspect-[3/4]"
            duotone
          />

          {/* El rótulo solo lo llevan las fotos de un componente: es lo que
              conecta esta foto con su línea en la lista de la derecha. */}
          {photo.caption && (
            <figcaption className="bg-canvas text-canvas-foreground text-marginalia absolute bottom-4 left-4 max-w-[calc(100%-2rem)] truncate rounded-md px-3 py-1.5 font-mono">
              {photo.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

/** La columna ocupa algo más de media pantalla en escritorio y toda en móvil. */
const PHOTO_SIZES = "(min-width: 1024px) 55vw, 100vw";
