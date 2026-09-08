import type { fulfillmentStatus, orderStatus } from "@/lib/db/schema";

/**
 * Qué significa que una parte esté viva, y qué se puede hacer con el pedido
 * según cómo estén las suyas.
 *
 * Todo aquí es puro: recibe filas y devuelve datos. La razón no es la elegancia
 * sino que estas son las reglas que se pueden equivocar caro —cobrar un pedido
 * que un proveedor no aceptó, cancelar uno que todavía tenía una parte en pie— y
 * probarlas contra una base es probarlas donde no se ven.
 *
 * El vocabulario plano (los rótulos de un estado) vive en `labels.ts`. Aquí solo
 * está lo que decide.
 */

type PartStatus = (typeof fulfillmentStatus.enumValues)[number];
type OrderStatus = (typeof orderStatus.enumValues)[number];

/**
 * Las tres que siguen contando para el pedido.
 *
 * Se escribe como el conjunto de las vivas y no como el de las caídas a
 * propósito: cuando el enum gane un estado, lo seguro es que no cuente hasta que
 * alguien lo añada aquí. Al revés, un estado nuevo entraría a la suma del total
 * en silencio.
 */
const LIVE_STATUSES = new Set<PartStatus>(["PENDING", "CONFIRMED", "DELIVERED"]);

export function isPartLive(status: PartStatus): boolean {
  return LIVE_STATUSES.has(status);
}

/** Solo una parte que nadie ha resuelto admite un sí o un no. */
export function isPartDecidable(status: PartStatus): boolean {
  return status === "PENDING";
}

type PartMoney = { subtotalUsd: number; status: PartStatus };

/**
 * Lo que se pagaría hoy: la suma de las partes que siguen en pie.
 *
 * Se calcula y no se guarda. Conviven tres cifras que dicen tres cosas distintas
 * —lo que se pidió (`totalUsd`, inmutable), esto, y lo que el comprador aceptó
 * pagar (`acknowledgedTotalUsd`)— y guardar la del medio obligaría a mantenerla
 * sincronizada con cada parte que se cae.
 */
export function liveTotalUsd(parts: PartMoney[]): number {
  const total = parts
    .filter((part) => isPartLive(part.status))
    .reduce((sum, part) => sum + part.subtotalUsd, 0);
  // El céntimo se redondea aquí porque `numeric` entra como `number`: sumar tres
  // subtotales en coma flotante deja colas de 0.000000001 que acaban en pantalla.
  return Math.round(total * 100) / 100;
}

/**
 * El marcador «2 de 3 confirmados» que el comprador mira mientras espera.
 *
 * Cuenta sobre las vivas y no sobre todas: una parte que se cayó ya no está
 * esperando a nadie, y dejarla en el denominador haría que el marcador nunca
 * llegara a completarse.
 */
export function confirmationProgress(parts: { status: PartStatus }[]): {
  answered: number;
  live: number;
  allAnswered: boolean;
} {
  const live = parts.filter((part) => isPartLive(part.status));
  const answered = live.filter((part) => part.status !== "PENDING").length;
  return { answered, live: live.length, allAnswered: answered === live.length };
}

export type PaymentGate =
  | { ok: true }
  | { ok: false; reason: "AWAITING_SUPPLIERS"; pending: number }
  | { ok: false; reason: "TOTAL_CHANGED"; liveTotalUsd: number; acknowledgedTotalUsd: number }
  | { ok: false; reason: "NOTHING_LIVE" };

/**
 * La puerta del cobro, que es la regla más cara de saltarse de toda la etapa.
 *
 * No se puede confirmar un pago mientras un proveedor no haya dicho que sí: el
 * dinero entra, y después resulta que la mitad del pedido no existía. Y tampoco
 * mientras el total vivo se haya separado de lo que el comprador aceptó pagar
 * —una parte se cayó y todavía no ha dicho si sigue—, porque entonces no se sabe
 * cuánto hay que cobrar.
 *
 * Devuelve **por qué** y no solo si se puede: la cola de pagos lo escribe en la
 * fila ("1 proveedor sin confirmar") para que el admin sepa a quién llamar. Un
 * booleano obligaría a recalcular el motivo en la pantalla.
 *
 * La Action la vuelve a llamar antes de escribir. Esconder el botón no es la
 * defensa; esto lo es.
 */
export function paymentGate({
  parts,
  acknowledgedTotalUsd,
}: {
  parts: PartMoney[];
  acknowledgedTotalUsd: number;
}): PaymentGate {
  const live = parts.filter((part) => isPartLive(part.status));
  if (live.length === 0) return { ok: false, reason: "NOTHING_LIVE" };

  const pending = live.filter((part) => part.status === "PENDING").length;
  if (pending > 0) return { ok: false, reason: "AWAITING_SUPPLIERS", pending };

  const live_ = liveTotalUsd(parts);
  if (live_ !== acknowledgedTotalUsd) {
    return { ok: false, reason: "TOTAL_CHANGED", liveTotalUsd: live_, acknowledgedTotalUsd };
  }

  return { ok: true };
}

/**
 * En qué queda el pedido cuando una de sus partes acaba de caerse.
 *
 * `null` significa "no lo toques": es la respuesta normal, porque una parte que
 * se cae casi nunca decide nada sobre el resto. Solo cuando no queda ninguna
 * viva el pedido se cancela solo — y ni siquiera entonces si ya estaba cobrado,
 * que es la regla de "un pedido `PAID` no vence".
 */
export function nextOrderStatus({
  current,
  parts,
}: {
  current: OrderStatus;
  parts: { status: PartStatus }[];
}): OrderStatus | null {
  if (current !== "PENDING_PAYMENT" && current !== "PAYMENT_REPORTED") return null;
  if (parts.some((part) => isPartLive(part.status))) return null;
  return "CANCELLED";
}

/**
 * Si el comprador tiene algo que decidir: el pedido encogió y todavía no ha
 * dicho si sigue con lo que queda.
 *
 * Es una comparación entre dos números y no un estado nuevo, justo para no tener
 * que mantenerlo sincronizado con cada parte que se cae.
 */
export function needsBuyerDecision({
  parts,
  acknowledgedTotalUsd,
}: {
  parts: PartMoney[];
  acknowledgedTotalUsd: number;
}): boolean {
  return (
    parts.some((part) => isPartLive(part.status)) &&
    liveTotalUsd(parts) !== acknowledgedTotalUsd
  );
}

export type PartOutcomePart = {
  status: PartStatus;
  confirmedAt: Date | null;
  declineReason: string | null;
};

/**
 * Lo que le pasó a esta parte, en la frase que lee el comprador.
 *
 * Es una función y no una tabla porque tres de los seis estados no se explican
 * solos: un rechazo lleva su motivo, y un vencimiento significa dos cosas
 * distintas según si el proveedor había llegado a aceptar. Enseñar «Vencido» a
 * secas en los dos casos es lo que genera la llamada.
 */
export function partOutcome(part: PartOutcomePart): string {
  switch (part.status) {
    case "PENDING":
      return "Esperando que el proveedor confirme";
    case "CONFIRMED":
      return "Confirmado por el proveedor";
    case "DELIVERED":
      return "Entregado";
    case "DECLINED":
      return part.declineReason
        ? `No pudo atenderlo: ${part.declineReason}`
        : "No pudo atenderlo";
    case "EXPIRED":
      return part.confirmedAt
        ? "Lo aceptó, pero venció la reserva antes de completar el pago"
        : "No respondió a tiempo";
    case "CANCELLED":
      return "Cancelado";
  }
}
