import "server-only";

/**
 * El mismo kit, ofrecido por distintos proveedores.
 *
 * Es el giro del comparador de la home: lo que se compara ya no son tres kits
 * distintos —eso lo elige el visitante en el buscador del hero— sino quién te
 * instala el que te hace falta. Precio, respaldo y capacidad varían por
 * proveedor aunque el kit sea el mismo, y eso es justo lo que hay que ver.
 */
export type KitOffer = {
  /** El kit ofertado. Casa con `KitComparison.slug`. */
  kitSlug: string;
  /** Slug del proveedor; es el `?supplier=` del catálogo. */
  supplierSlug: string;
  supplierName: string;
  /** Lo más barato que ofrece ese proveedor por este kit, en USD. */
  fromUsd: number;
  /** Respaldo sin sol, tal como se dice: "8–12 h sin sol". */
  backup: string;
  capacityKwh: number;
  /** Distintivo sobre la foto. Solo uno por kit; hoy viene fijo en los datos. */
  badge?: string;
  /** Texto alternativo de la foto. */
  photo: string;
  /** Foto del kit instalado, subida a Blob. Banco de imágenes mientras el proveedor no mande la suya. */
  photoUrl: string;
};

/**
 * ⚠️ MOCK — ni los proveedores ni los precios son reales. Las fotos tampoco:
 * son banco de imágenes (Unsplash) subido a Blob, no la instalación real de
 * ningún proveedor.
 *
 * Existe para poder juzgar la forma de la sección; el contenido va rotulado
 * como ejemplo allá donde se muestra. Cuando haya proveedores de verdad, esto
 * se reemplaza por una query sobre `suppliers` + `kits` sin tocar la UI: la
 * firma de `getKitOffers()` ya es la definitiva — y `photoUrl` pasa a ser la
 * foto que mande cada proveedor.
 *
 * Los tres proveedores se repiten en los tres kits a propósito: es lo que hace
 * legible el cambio de pestaña — lo que se mueve es el precio y el respaldo,
 * no el reparto de nombres.
 */
const BLOB_HOST = "https://9lphmnrf8luyomrq.public.blob.vercel-storage.com";

const MOCK_OFFERS: KitOffer[] = [
  {
    kitSlug: "kit-basico",
    supplierSlug: "solarcaribe",
    supplierName: "SolarCaribe",
    fromUsd: 780,
    backup: "4–6 h sin sol",
    capacityKwh: 1.6,
    badge: "más elegido",
    photo: "Kit básico instalado — SolarCaribe",
    photoUrl: `${BLOB_HOST}/landing/kit-basico-solarcaribe.jpg`,
  },
  {
    kitSlug: "kit-basico",
    supplierSlug: "techo-solar-habana",
    supplierName: "Techo Solar Habana",
    fromUsd: 820,
    backup: "4–5 h sin sol",
    capacityKwh: 1.6,
    photo: "Kit básico instalado — Techo Solar Habana",
    photoUrl: `${BLOB_HOST}/landing/kit-basico-techo-solar-habana.jpg`,
  },
  {
    kitSlug: "kit-basico",
    supplierSlug: "energia-oriente",
    supplierName: "Energía Oriente",
    fromUsd: 760,
    backup: "4–6 h sin sol",
    capacityKwh: 1.7,
    photo: "Kit básico instalado — Energía Oriente",
    photoUrl: `${BLOB_HOST}/landing/kit-basico-energia-oriente.jpg`,
  },

  {
    kitSlug: "kit-casa",
    supplierSlug: "solarcaribe",
    supplierName: "SolarCaribe",
    fromUsd: 1450,
    backup: "8–12 h sin sol",
    capacityKwh: 3.2,
    badge: "más elegido",
    photo: "Kit casa instalado — SolarCaribe",
    photoUrl: `${BLOB_HOST}/landing/kit-casa-solarcaribe.jpg`,
  },
  {
    kitSlug: "kit-casa",
    supplierSlug: "techo-solar-habana",
    supplierName: "Techo Solar Habana",
    fromUsd: 1510,
    backup: "8–10 h sin sol",
    capacityKwh: 3.2,
    photo: "Kit casa instalado — Techo Solar Habana",
    photoUrl: `${BLOB_HOST}/landing/kit-casa-techo-solar-habana.jpg`,
  },
  {
    kitSlug: "kit-casa",
    supplierSlug: "energia-oriente",
    supplierName: "Energía Oriente",
    fromUsd: 1390,
    backup: "9–12 h sin sol",
    capacityKwh: 3.3,
    photo: "Kit casa instalado — Energía Oriente",
    photoUrl: `${BLOB_HOST}/landing/kit-casa-energia-oriente.jpg`,
  },

  {
    kitSlug: "kit-negocio",
    supplierSlug: "solarcaribe",
    supplierName: "SolarCaribe",
    fromUsd: 2760,
    backup: "el día entero",
    capacityKwh: 6.4,
    badge: "más elegido",
    photo: "Kit negocio instalado — SolarCaribe",
    photoUrl: `${BLOB_HOST}/landing/kit-negocio-solarcaribe.jpg`,
  },
  {
    kitSlug: "kit-negocio",
    supplierSlug: "techo-solar-habana",
    supplierName: "Techo Solar Habana",
    fromUsd: 2840,
    backup: "18–24 h sin sol",
    capacityKwh: 6.4,
    photo: "Kit negocio instalado — Techo Solar Habana",
    photoUrl: `${BLOB_HOST}/landing/kit-negocio-techo-solar-habana.jpg`,
  },
  {
    kitSlug: "kit-negocio",
    supplierSlug: "energia-oriente",
    supplierName: "Energía Oriente",
    fromUsd: 2690,
    backup: "20–24 h sin sol",
    capacityKwh: 6.6,
    photo: "Kit negocio instalado — Energía Oriente",
    photoUrl: `${BLOB_HOST}/landing/kit-negocio-energia-oriente.jpg`,
  },
];

/** Quién ofrece hoy cada kit. La home los agrupa por kit al pintarlos. */
export async function getKitOffers(): Promise<KitOffer[]> {
  return MOCK_OFFERS;
}
