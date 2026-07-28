import "server-only";

// Los tres kits que se comparan en la landing, reducidos a lo que de verdad
// decide la compra: qué mueve, cuánto aguanta y cuánto cuesta.
export type KitComparison = {
  slug: string;
  name: string;
  /** En lenguaje de la casa, no de ingeniería: "la nevera y dos ventiladores". */
  moves: string;
  /** Respaldo sin sol, tal como se dice: "4 h sin sol", "El día entero". */
  backup: string;
  capacityKwh: number;
  priceUsd: number;
  /**
   * Etiqueta sobre el nombre del kit. Hoy viene fija en los datos; cuando
   * exista el selector de horas de apagón, será él quien decida cuál lleva la
   * marca según lo que el visitante haya pedido.
   */
  highlight?: string;
};

// MOCK — kits de ejemplo hasta que la landing lea los reales de la BD. Cuando
// existan, esto se reemplaza por una query sobre `kits` sin tocar la UI: la
// firma de getKitComparison() ya es la definitiva.
const MOCK_KITS: KitComparison[] = [
  {
    slug: "kit-basico",
    name: "Kit básico",
    moves: "Las luces, los celulares y un ventilador.",
    backup: "4 h sin sol",
    capacityKwh: 1.6,
    priceUsd: 780,
  },
  {
    slug: "kit-casa",
    name: "Kit casa",
    moves: "La nevera, dos ventiladores, las luces y la TV.",
    backup: "8–12 h sin sol",
    capacityKwh: 3.2,
    priceUsd: 1450,
    highlight: "para ti",
  },
  {
    slug: "kit-negocio",
    name: "Kit negocio",
    moves: "La nevera, el freezer, la bomba de agua y las luces.",
    backup: "El día entero",
    capacityKwh: 6.4,
    priceUsd: 2760,
  },
];

export async function getKitComparison(): Promise<KitComparison[]> {
  return MOCK_KITS;
}
