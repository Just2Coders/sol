/**
 * De un carrito a las unidades que hay que retener, en puro.
 *
 * Parece una suma y no lo es: un kit no reserva "un kit", reserva sus piezas; el
 * mismo panel puede llegar suelto y dentro de un kit; y un servicio no reserva
 * nada. Equivocarse aquí es vender lo que no hay, así que vive aparte del acceso
 * a datos y lleva sus tests.
 */

/** Una línea del carrito, reducida a lo que decide qué se retiene. */
export type ReservableLine = {
  type: "PRODUCT" | "KIT" | "SERVICE";
  /** `products.id`, `kits.id` o `services.id` según `type`. */
  id: string;
  quantity: number;
};

/** Lo que un kit lleva dentro: qué producto y cuántos por kit. */
export type KitPiece = { productId: string; quantity: number };

/** Cuántas unidades de un producto hay que retener. */
export type ReservationIntent = { productId: string; units: number };

export type ReservationPlan = {
  /**
   * Las intenciones, **ordenadas por `productId`**. El orden no es cosmético:
   * dos carritos que retuvieran A y B en órdenes distintos dentro de sendas
   * transacciones se bloquearían mutuamente. Pedir siempre en el mismo orden
   * elimina el interbloqueo sin necesidad de nada más.
   */
  intents: ReservationIntent[];
  /**
   * Kits del carrito de los que no se sabe la composición.
   *
   * Se devuelven en vez de ignorarlos: saltárselos en silencio retendría de
   * menos, que es exactamente cómo se vende lo que no hay. Quien llama tiene que
   * parar el checkout y decir cuál.
   */
  unknownKits: string[];
};

/**
 * Qué retener por un carrito.
 *
 * `compositions` mapea `kits.id` a sus piezas. Lo llena quien lea la base; aquí
 * solo se decide, para poder probarlo sin levantar nada.
 */
export function reservationPlan(
  lines: ReservableLine[],
  compositions: Map<string, KitPiece[]>,
): ReservationPlan {
  const units = new Map<string, number>();
  const unknownKits: string[] = [];

  const add = (productId: string, amount: number) => {
    if (amount <= 0) return;
    units.set(productId, (units.get(productId) ?? 0) + amount);
  };

  for (const line of lines) {
    if (line.quantity <= 0) continue;

    if (line.type === "PRODUCT") {
      add(line.id, line.quantity);
      continue;
    }

    // La mano de obra no se agota en un almacén: no retiene nada.
    if (line.type === "SERVICE") continue;

    const pieces = compositions.get(line.id);
    if (!pieces) {
      if (!unknownKits.includes(line.id)) unknownKits.push(line.id);
      continue;
    }

    // Dos kits de tres paneles son seis paneles.
    for (const piece of pieces) add(piece.productId, piece.quantity * line.quantity);
  }

  const intents = [...units.entries()]
    .map(([productId, amount]) => ({ productId, units: amount }))
    .sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));

  return { intents, unknownKits };
}
