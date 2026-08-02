import type { CatalogKitItem } from "@/lib/catalog/queries";

/**
 * La columna de fotos de una ficha, como dato puro.
 *
 * La ficha se lee en dos columnas que hablan entre sí: a la izquierda las
 * fotos, a la derecha los datos. En un kit cada componente aporta la suya, y el
 * nombre del componente en la lista de la derecha salta a esa foto — por eso la
 * foto necesita saber **a qué componente pertenece**, y por eso el id del ancla
 * se calcula en un solo sitio (`photoAnchorId`) que usan las dos columnas.
 *
 * Módulo sin dependencias de servidor: lo importan la página y los componentes.
 */

export type CatalogPhoto = {
  src: string;
  /** Texto alternativo ya resuelto: nadie más tiene que componerlo. */
  alt: string;
  /**
   * Componente del kit al que pertenece, o `null` si es una foto del propio
   * item.
   */
  componentId: string | null;
  /**
   * El ancla, solo en la **primera** foto de cada componente: un id se puede
   * repetir en el DOM tan poco como un destino puede estar en dos sitios.
   */
  anchorId: string | null;
  /** Rótulo sobre la foto. Solo lo llevan las de un componente. */
  caption: string | null;
};

/** El ancla de la foto de un componente. Un solo sitio: la escriben las dos columnas. */
export function photoAnchorId(componentId: string): string {
  return `photo-${componentId}`;
}

/** Las fotos de un producto o un servicio: las suyas, sin rótulo. */
export function itemPhotos(images: string[], name: string): CatalogPhoto[] {
  return images.map((src, index) => ({
    src,
    alt: index === 0 ? name : `${name} — foto ${index + 1}`,
    componentId: null,
    anchorId: null,
    caption: null,
  }));
}

/**
 * Las fotos de un kit: primero las del conjunto armado, después las de cada
 * componente, en el mismo orden en que se listan a la derecha.
 *
 * Un componente aporta **todas** sus fotos, no solo la primera: un kit se compra
 * por sus piezas y quien duda quiere verlas. El ancla, en cambio, va solo en la
 * primera de cada componente — es el destino del salto desde su nombre.
 *
 * Un componente sin fotos no aporta ninguna, y su nombre en la lista se queda sin
 * salto: no hay a dónde ir.
 */
export function kitPhotos(
  images: string[],
  name: string,
  items: CatalogKitItem[],
): CatalogPhoto[] {
  const photos = itemPhotos(images, name);

  for (const item of items) {
    item.productImages.forEach((src, index) => {
      photos.push({
        src,
        alt:
          index === 0
            ? item.productName
            : `${item.productName} — foto ${index + 1}`,
        componentId: item.productId,
        anchorId: index === 0 ? photoAnchorId(item.productId) : null,
        caption: item.productName,
      });
    });
  }

  return photos;
}

/** Qué componentes acabaron teniendo foto: lo que decide si su nombre salta. */
export function photographedComponents(photos: CatalogPhoto[]): Set<string> {
  const ids = new Set<string>();
  for (const photo of photos) {
    if (photo.componentId) ids.add(photo.componentId);
  }
  return ids;
}
