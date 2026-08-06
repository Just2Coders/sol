/**
 * Qué se puede vender hoy, como funciones puras.
 *
 * Sin `server-only` y sin `db` a propósito: son las reglas del dominio, no su
 * lectura. Las importan la consulta del catálogo, la ficha y el checkout, y se
 * pueden probar sin levantar nada (`lib/inventory/availability.test.ts`).
 *
 * La regla de fondo cabe en una línea: **vendible = `stock - reserved`**. Lo
 * retenido por un pedido sin cobrar no está disponible para nadie más, o dos
 * personas compran el último panel y a una hay que devolverle el dinero.
 */

/** Lo que hace falta saber de un producto para decir cuánto queda. */
export type StockLevel = {
  /** Lo que hay en el almacén. */
  stock: number;
  /** Lo comprometido por pedidos que aún no se han cobrado. */
  reserved: number;
};

/**
 * Unidades que se pueden vender ahora mismo.
 *
 * Nunca negativo: un `reserved` mayor que el `stock` significa que algo se
 * descuadró —lo caza `npm run check:inventory`—, pero la tienda no puede
 * responder con un número imposible mientras tanto. Se enseña cero, que es la
 * verdad operativa: no hay nada que vender.
 */
export function availableUnits({ stock, reserved }: StockLevel): number {
  return Math.max(0, stock - reserved);
}

/** Una pieza de un kit: su nivel de stock y cuántas lleva el kit. */
export type KitComponent = StockLevel & {
  /** Cuántas unidades de esta pieza entran en **un** kit. */
  quantity: number;
};

/**
 * Cuántos kits se pueden armar con lo que hay.
 *
 * Un kit no tiene existencias propias: es la derivada de sus piezas, y manda la
 * más escasa. Con 10 paneles y 1 inversor no hay diez kits, hay uno.
 *
 * **Un kit sin piezas no se puede armar.** Podría parecer que "no le falta
 * nada" y devolver infinito, pero un kit vacío es un error de carga del
 * proveedor, no una existencia infinita.
 *
 * Una pieza con `quantity <= 0` se ignora: no aporta escasez porque no se
 * necesita, y dividir por cero no significa nada.
 */
export function kitAvailableUnits(components: KitComponent[]): number {
  const needed = components.filter((component) => component.quantity > 0);
  if (needed.length === 0) return 0;

  return needed.reduce((fewest, component) => {
    const possible = Math.floor(availableUnits(component) / component.quantity);
    return Math.min(fewest, possible);
  }, Number.POSITIVE_INFINITY);
}

/**
 * Las piezas que hoy impiden armar un kit.
 *
 * Es lo que convierte un "agotado" en una explicación: sin esto, la ficha de un
 * kit solo puede decir que no hay, y quien mira no sabe si le falta el panel o
 * la batería — ni si merece la pena volver mañana.
 */
export function missingComponents<T extends KitComponent>(components: T[]): T[] {
  return components.filter(
    (component) =>
      component.quantity > 0 && availableUnits(component) < component.quantity,
  );
}
