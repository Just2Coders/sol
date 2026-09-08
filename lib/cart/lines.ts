import type { PurchasableType } from "@/lib/catalog/filters";
import type { EquipmentScope } from "@/lib/services/enums";

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
  type: PurchasableType;
  /** `products.id`, `kits.id` o `services.id` según `type`. */
  id: string;
  slug: string;
  name: string;
  priceUsd: number;
  /**
   * La unidad que se multiplica cuando la línea no se cuenta por piezas: un
   * servicio por unidad de obra ("panel", "metro de cable"). `null` en todo lo
   * demás, que va por unidades sueltas.
   */
  unitLabel?: string | null;
  /** Primera foto de la ficha, o `null` si el proveedor no cargó ninguna. */
  image: string | null;
  quantity: number;
  /**
   * Quién lo entrega. Va por slug y no por id porque el catálogo público nunca
   * expone los uuid internos del proveedor, y con el slug basta para lo que el
   * cliente hace con él: repartir el pedido en grupos y enseñar de quién es
   * cada uno. Ojo con una línea de servicio: aquí va el proveedor **del
   * servicio**, que no siempre es el del equipo desde cuya ficha se añadió.
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
 * ¿Trae el carrito el equipo sobre el que este servicio puede trabajar?
 *
 * El alcance decide qué cuenta como "su equipo" (ver PLAN.md): un `OWN` solo
 * trabaja sobre lo que vendió su propio proveedor, un `PLATFORM` acepta lo de
 * cualquiera de Solaris, y un `ANY` no necesita nada porque también sirve para
 * lo que el comprador consiguió fuera — es el único que se puede contratar a
 * ciegas.
 *
 * Sale de las propias líneas y no de la base a propósito: es la misma pregunta
 * que responde la ficha para decidir si enseña el bloque de compra y la que
 * revalidará el checkout entre grupos (Etapa 6), así que se escribe una vez y
 * en el módulo puro que los dos pueden importar.
 *
 * Solo cuenta el equipo: una línea de servicio no instala a otro servicio.
 *
 * _Queda una segunda puerta por abrir:_ con «Mis equipos» (Etapa 9) el equipo
 * podrá venir además de un pedido pagado anterior, y eso sí habrá que
 * consultarlo. Esta función seguirá siendo la mitad del carrito.
 */
export function cartCoversService(
  lines: CartLine[],
  service: { equipmentScope: EquipmentScope; supplierSlug: string },
): boolean {
  if (service.equipmentScope === "ANY") return true;

  return lines.some(
    (line) =>
      (line.type === "PRODUCT" || line.type === "KIT") &&
      (service.equipmentScope === "PLATFORM" ||
        line.supplierSlug === service.supplierSlug),
  );
}

/** Lo que entrega un proveedor dentro del pedido: sus líneas y lo que suman. */
export type CartGroup = {
  supplierSlug: string;
  supplierName: string;
  lines: CartLine[];
  subtotalUsd: number;
};

/**
 * El carrito repartido por quién entrega cada cosa.
 *
 * Un pedido puede llevar varios proveedores y se paga una sola vez (ver
 * `PLAN.md`), pero cada uno entrega y cobra lo suyo: estos grupos son la misma
 * forma que tendrá el pedido en la base (`order_suppliers`), y por eso los
 * mismos que enseña el panel y los que revalida el checkout.
 *
 * El orden es el de llegada —el grupo se abre donde entró su primera línea— y no
 * alfabético: añadir algo no debe reordenar lo que el visitante ya tenía puesto
 * delante de los ojos.
 */
export function cartGroups(lines: CartLine[]): CartGroup[] {
  const groups = new Map<string, CartGroup>();

  for (const line of lines) {
    const group = groups.get(line.supplierSlug);
    if (group) {
      group.lines.push(line);
      continue;
    }
    groups.set(line.supplierSlug, {
      supplierSlug: line.supplierSlug,
      supplierName: line.supplierName,
      lines: [line],
      subtotalUsd: 0,
    });
  }

  // El subtotal se cierra al final y sobre las líneas ya juntas: es la misma
  // suma que el total del carrito, hecha por partes.
  for (const group of groups.values()) {
    group.subtotalUsd = cartSubtotalUsd(group.lines);
  }

  return [...groups.values()];
}
