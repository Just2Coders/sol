import type { fulfillmentStatus, orderStatus } from "@/lib/db/schema";

/**
 * Los estados del pedido en el idioma del comprador.
 *
 * Un módulo puro y no un helper dentro de una página porque los leen dos —el
 * listado y el detalle— y porque el día que el proveedor tenga su portal leerá
 * los mismos. Escribirlos dos veces es cómo acaban diciendo cosas distintas de
 * la misma fila.
 *
 * `satisfies Record<...>` en vez de anotar el tipo: así, si el enum del schema
 * gana un valor, esto deja de compilar en vez de enseñar un hueco.
 */

type OrderStatus = (typeof orderStatus.enumValues)[number];
type FulfillmentStatus = (typeof fulfillmentStatus.enumValues)[number];

/** El eje del pago, que es uno solo para todo el pedido. */
export const ORDER_STATUS_LABEL = {
  PENDING_PAYMENT: "Esperando tu pago",
  PAYMENT_REPORTED: "Revisando tu pago",
  PAID: "Pagado",
  COMPLETED: "Entregado",
  CANCELLED: "Cancelado",
} satisfies Record<OrderStatus, string>;

/** El eje de la entrega, que es de cada proveedor por su lado. */
export const PART_STATUS_LABEL = {
  PENDING: "Pendiente",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
} satisfies Record<FulfillmentStatus, string>;
