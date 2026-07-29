import type { CatalogType } from "@/lib/catalog/filters";

/**
 * El carrito como dato puro: qué es una línea y cómo se suma.
 *
 * Vive aparte del store (`lib/cart/store.ts`) porque no depende de zustand ni
 * del navegador: lo importa el cliente para pintar el panel y, cuando llegue el
 * checkout, el servidor para leer lo que manda el cliente. Como el módulo no
 * toca `db` ni `next/headers`, se puede importar desde los dos lados — igual
 * que `lib/catalog/filters.ts`.
 *
 * Nada de aquí es fuente de verdad: el precio y el nombre que guarda una línea
 * son una **foto** de lo que veía el visitante en la ficha, para poder pintar el
 * carrito sin volver al servidor. Al crear la orden se vuelve a leer el catálogo
 * y son esos valores —no estos— los que se cobran y se copian a `order_items`.
 */

export type CartLine = {
  type: CatalogType;
  /** `products.id` o `kits.id` según `type`. */
  id: string;
  slug: string;
  name: string;
  priceUsd: number;
  /** Primera foto de la ficha, o `null` si el proveedor no cargó ninguna. */
  image: string | null;
  quantity: number;
  /**
   * Quién lo entrega. Va por slug y no por id porque el catálogo público nunca
   * expone los uuid internos del proveedor, y con el slug basta para lo único
   * que el cliente decide: si un item cabe en el carrito que ya hay montado.
   */
  supplierSlug: string;
  supplierName: string;
  /** Unidades disponibles cuando se añadió; `null` en un kit, que no lleva stock. */
  stock: number | null;
};

/** Lo que hace falta para añadir algo: la línea sin la cantidad. */
export type CartItem = Omit<CartLine, "quantity">;

/**
 * Un producto y un kit pueden compartir uuid sin que pase nada —son tablas
 * distintas—, así que la identidad de una línea es el par tipo + id.
 */
export function cartLineKey(item: Pick<CartLine, "type" | "id">): string {
  return `${item.type}:${item.id}`;
}

/**
 * Tope de una línea. No es una regla de negocio, es un seguro contra el dedo
 * pegado en el "+": una casa no compra 900 inversores.
 */
export const MAX_LINE_QUANTITY = 99;

/** La cantidad que de verdad se puede pedir: nunca más de lo que hay. */
export function clampQuantity(quantity: number, stock: number | null): number {
  const ceiling = stock === null ? MAX_LINE_QUANTITY : Math.min(stock, MAX_LINE_QUANTITY);
  return Math.max(0, Math.min(Math.trunc(quantity), ceiling));
}

// Los centavos se cierran por línea, como en la ficha del kit: los precios son
// numeric(10,2) y multiplicar en binario deja colas de coma flotante.
export function lineTotalUsd(line: CartLine): number {
  return Math.round(line.priceUsd * line.quantity * 100) / 100;
}

export function cartSubtotalUsd(lines: CartLine[]): number {
  const total = lines.reduce((sum, line) => sum + lineTotalUsd(line), 0);
  return Math.round(total * 100) / 100;
}

/** Piezas en el carrito, no líneas: es el número que lleva la burbuja. */
export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * El proveedor del carrito, o `null` si está vacío.
 *
 * Una orden es de un solo proveedor (ver `PLAN.md`), así que basta con mirar la
 * primera línea: el store no deja entrar una segunda de otro.
 */
export function cartSupplier(
  lines: CartLine[],
): { slug: string; name: string } | null {
  const first = lines[0];
  return first ? { slug: first.supplierSlug, name: first.supplierName } : null;
}
