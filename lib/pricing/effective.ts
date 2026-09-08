/**
 * El precio como línea de tiempo, en funciones puras.
 *
 * `price_schedules` es la verdad: las filas pasadas son el histórico, las
 * futuras el precio programado, y el efectivo es el de mayor `startsAt` que ya
 * haya empezado. La columna `price_usd` de cada tabla es solo una **caché** de
 * esa respuesta, y existe porque el listado ordena y filtra por rango sobre ella.
 *
 * Estas funciones son las que decide el dinero: el checkout relee el schedule
 * antes de escribir el snapshot de `order_items`, así que un cron que llegue
 * tarde deja el listado desfasado un rato pero nunca cobra mal.
 */

/** Una fila de la línea de tiempo, reducida a lo que decide el precio. */
export type PriceEntry = {
  priceUsd: number;
  startsAt: Date;
};

/**
 * El precio que rige en un instante.
 *
 * `null` cuando no hay ninguna fila que ya haya empezado — un item cuya línea de
 * tiempo empieza mañana. Quien llama decide qué hacer con eso; devolver 0 sería
 * regalar el producto.
 *
 * El empate lo gana **la última de la lista**: dos filas con el mismo `startsAt`
 * son un error de carga, y ante la duda vale la más recientemente añadida.
 */
export function effectivePrice(
  entries: PriceEntry[],
  at: Date = new Date(),
): number | null {
  let best: PriceEntry | null = null;

  for (const entry of entries) {
    if (entry.startsAt.getTime() > at.getTime()) continue;
    if (best === null || entry.startsAt.getTime() >= best.startsAt.getTime()) {
      best = entry;
    }
  }

  return best?.priceUsd ?? null;
}

/**
 * El próximo cambio de precio, si lo hay.
 *
 * Lo usan el panel del proveedor y el del admin — **no el catálogo**: anunciarle
 * al comprador que algo baja el día 15 mata la venta de hoy y convierte una
 * previsión en una promesa de precio.
 */
export function nextPriceChange(
  entries: PriceEntry[],
  at: Date = new Date(),
): PriceEntry | null {
  let next: PriceEntry | null = null;

  for (const entry of entries) {
    if (entry.startsAt.getTime() <= at.getTime()) continue;
    if (next === null || entry.startsAt.getTime() < next.startsAt.getTime()) {
      next = entry;
    }
  }

  return next;
}

/**
 * Las filas cuyo momento ya llegó pero que la caché todavía no refleja.
 *
 * Es lo que el cron promueve: para cada item, si su precio efectivo no coincide
 * con lo que tiene escrito, hay que reescribirlo. Aquí en puro para poder
 * probarlo; quien lo llama pone la lectura y la escritura.
 */
export function needsPromotion(
  entries: PriceEntry[],
  cachedPriceUsd: number,
  at: Date = new Date(),
): boolean {
  const effective = effectivePrice(entries, at);
  return effective !== null && effective !== cachedPriceUsd;
}
