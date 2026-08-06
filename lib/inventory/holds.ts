/**
 * Los relojes de una reserva, en funciones puras.
 *
 * Hay cuatro esperas en un pedido —que el proveedor confirme, que el stock siga
 * retenido, que el comprador decida si alguien rechazó y que pague— y modeladas
 * como cuatro ajustes independientes se contradicen en cuanto alguien toca uno.
 * Aquí hay **un** ajuste (`reservationHoldHours` del proveedor) y todo lo demás
 * se deriva. Ver PLAN.md, «Los relojes, que son uno solo».
 */

/**
 * Lo que la plataforma retiene cuando el proveedor no dice otra cosa.
 *
 * Tres días es lo que tarda de verdad un Zelle manual entre reportar y que el
 * admin lo verifique en el banco. No es un número redondo elegido al azar: es la
 * ventana del medio de pago que hay hoy, y por eso baja sola el día que entre
 * QvaPay (Etapa 11).
 */
export const DEFAULT_HOLD_HOURS = 72;

/**
 * Cuánto tiene el proveedor para aceptar su parte.
 *
 * Nunca más que lo que él mismo retiene: no tiene sentido guardar tres días de
 * mercancía para alguien que todavía no ha dicho que sí. Y nunca más de un día,
 * que es lo que la plataforma está dispuesta a esperar sin noticias.
 */
export const MAX_CONFIRMATION_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Cuántas horas retiene de verdad este proveedor.
 *
 * `null`, cero o un negativo caen al default: son "no lo ha configurado" y dos
 * formas de configurarlo mal, y ninguna de las tres puede significar "no
 * retengas nada" — eso dejaría el pedido muerto antes de nacer.
 */
export function holdHoursFor(supplierHoldHours: number | null | undefined): number {
  if (supplierHoldHours == null || supplierHoldHours <= 0) return DEFAULT_HOLD_HOURS;
  return supplierHoldHours;
}

/**
 * Cuándo vence la reserva que se crea ahora.
 *
 * El resultado es **absoluto y se escribe una vez**, igual que el snapshot de
 * precio de `order_items`: si el proveedor cambia de idea mañana, los pedidos en
 * curso no se le mueven debajo.
 */
export function reservationExpiresAt(
  now: Date,
  supplierHoldHours: number | null | undefined,
): Date {
  return new Date(now.getTime() + holdHoursFor(supplierHoldHours) * HOUR_MS);
}

/** Cuándo se le acaba el plazo al proveedor para aceptar su parte. */
export function confirmationDueAt(
  now: Date,
  supplierHoldHours: number | null | undefined,
): Date {
  const hours = Math.min(MAX_CONFIRMATION_HOURS, holdHoursFor(supplierHoldHours));
  return new Date(now.getTime() + hours * HOUR_MS);
}

/**
 * Cuándo le pasa al pedido lo próximo que le va a pasar.
 *
 * Es **el más temprano** de sus vencimientos vivos, y el único número que ve el
 * comprador: un pedido con tres proveedores tendría tres fechas y eso no se le
 * puede enseñar a nadie.
 *
 * Llegar ahí tumba **esa parte, no el pedido**: se libera su stock y este mínimo
 * se recalcula sobre las que quedan, así que la fecha se aleja. Por eso solo
 * puede alargarse — lo único que la mueve es algo que ya se cayó.
 *
 * `null` cuando no queda ninguna reserva viva. Pasa de verdad: un carrito solo
 * de servicios no reserva nada, y ahí manda el default de la plataforma. Es el
 * caso que se olvida y deja un pedido sin vencimiento.
 */
export function orderExpiresAt(liveExpiries: Date[]): Date | null {
  if (liveExpiries.length === 0) return null;

  return liveExpiries.reduce((earliest, expiry) =>
    expiry.getTime() < earliest.getTime() ? expiry : earliest,
  );
}

/**
 * ¿Aguanta esta reserva lo que tarda el medio de pago más lento habilitado?
 *
 * El suelo no lo pone la plataforma por gusto: un hold de 12 h es razonable para
 * quien tiene dos paneles y gente entrando a la tienda, pero con Zelle manual no
 * da tiempo a completar la compra. Se avisa —al proveedor al configurarlo y al
 * comprador en el checkout—, no se prohíbe: es su mercancía.
 */
export function coversPaymentWindow(
  supplierHoldHours: number | null | undefined,
  paymentWindowHours: number,
): boolean {
  return holdHoursFor(supplierHoldHours) >= paymentWindowHours;
}
