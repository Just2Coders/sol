import "server-only";

// Cobertura por provincia: cuántos proveedores activos operan en cada una.
// Es lo que alimenta el mapa de la landing.
export type ProvinceCoverage = {
  /** Coincide con el slug de la zona en `zones` y con el del mapa SVG. */
  slug: string;
  name: string;
  supplierCount: number;
};

// MOCK — datos de ejemplo hasta que las zonas reales de Cuba estén sembradas.
// Cuando existan, esto se reemplaza por un count sobre supplier_zones sin tocar
// la UI: la firma de getProvinceCoverage() ya es la definitiva.
const MOCK_COVERAGE: ProvinceCoverage[] = [
  { slug: "pinar-del-rio", name: "Pinar del Río", supplierCount: 1 },
  { slug: "artemisa", name: "Artemisa", supplierCount: 2 },
  { slug: "la-habana", name: "La Habana", supplierCount: 4 },
  { slug: "mayabeque", name: "Mayabeque", supplierCount: 2 },
  { slug: "matanzas", name: "Matanzas", supplierCount: 3 },
  { slug: "cienfuegos", name: "Cienfuegos", supplierCount: 1 },
  { slug: "villa-clara", name: "Villa Clara", supplierCount: 2 },
  { slug: "sancti-spiritus", name: "Sancti Spíritus", supplierCount: 1 },
  { slug: "ciego-de-avila", name: "Ciego de Ávila", supplierCount: 1 },
  { slug: "camaguey", name: "Camagüey", supplierCount: 2 },
  { slug: "las-tunas", name: "Las Tunas", supplierCount: 1 },
  { slug: "holguin", name: "Holguín", supplierCount: 3 },
  { slug: "granma", name: "Granma", supplierCount: 1 },
  { slug: "santiago-de-cuba", name: "Santiago de Cuba", supplierCount: 2 },
];

/**
 * Provincias con al menos un proveedor operando. Las que no aparecen en la
 * lista se pintan sin cobertura en el mapa.
 */
export async function getProvinceCoverage(): Promise<ProvinceCoverage[]> {
  return MOCK_COVERAGE;
}
