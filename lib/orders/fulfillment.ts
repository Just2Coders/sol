import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { orderSuppliers, orders } from "@/lib/db/schema";
import { releaseReservations } from "@/lib/inventory/reservations";
import { isPartDecidable, nextOrderStatus } from "./decisions";

/**
 * Lo que le pasa a una parte después de nacer: la aceptan, la rechazan o se le
 * acaba el tiempo.
 *
 * Los tres desenlaces son la misma escritura con distinto rótulo, y por eso hay
 * un solo camino (`settlePart`) en vez de tres funciones que se parecen. Lo que
 * cambia entre ellos es el estado y quién lo firma; lo que **no** cambia es el
 * resto, que es justo lo que no se puede olvidar: soltar el stock que retenía,
 * alejar el vencimiento del pedido y cancelarlo si no le queda nada vivo.
 *
 * Todo dentro de una transacción. Una parte marcada como rechazada cuyo stock
 * siguiera retenido es mercancía muerta que nadie va a soltar nunca: no hay
 * proceso que la busque, porque su reserva sigue pareciendo válida.
 */

/** Los tres finales, ya en el vocabulario del enum. */
type SettledStatus = "CONFIRMED" | "DECLINED" | "EXPIRED";

export type DecidePartResult =
  | { ok: true; orderCancelled: boolean }
  | { ok: false; reason: "NOT_FOUND" | "ALREADY_SETTLED" };

/**
 * El proveedor acepta su parte —o el admin lo hace en su nombre, que en la Fase 1
 * es el camino normal porque se resuelve por teléfono.
 *
 * `actorUserId` es quien lo hizo **de verdad**, no el proveedor: la parte ya sabe
 * de quién es, así que guardar a la persona basta para que el registro no mienta.
 */
export async function confirmPart({
  partId,
  actorUserId,
  now = new Date(),
}: {
  partId: string;
  actorUserId: string;
  now?: Date;
}): Promise<DecidePartResult> {
  return db.transaction((tx) =>
    settlePart(tx, { partId, status: "CONFIRMED", actorUserId, now }),
  );
}

/**
 * El proveedor no puede atenderla, y dice por qué.
 *
 * El motivo no es opcional: es lo que el comprador lee para decidir si sigue con
 * el resto del pedido, y «no pudo atenderlo» a secas no le sirve para elegir.
 */
export async function declinePart({
  partId,
  reason,
  actorUserId,
  now = new Date(),
}: {
  partId: string;
  reason: string;
  actorUserId: string;
  now?: Date;
}): Promise<DecidePartResult> {
  return db.transaction((tx) =>
    settlePart(tx, { partId, status: "DECLINED", reason, actorUserId, now }),
  );
}

/**
 * El corazón: mover una parte a su desenlace y arrastrar todo lo que cuelga.
 *
 * Vuelve a leer el estado **dentro** de la transacción y con `for update`, y no
 * se fía del que traía la pantalla: entre que el admin abrió la cola y pulsó el
 * botón, el cron pudo haber vencido esa misma parte. Sin el candado, los dos
 * escribirían y el segundo soltaría un stock ya soltado.
 */
async function settlePart(
  tx: Tx,
  {
    partId,
    status,
    reason,
    actorUserId,
    now,
  }: {
    partId: string;
    status: SettledStatus;
    reason?: string;
    /** Nulo cuando fue el reloj y no una persona. */
    actorUserId: string | null;
    now: Date;
  },
): Promise<DecidePartResult> {
  const [part] = await tx
    .select({ id: orderSuppliers.id, orderId: orderSuppliers.orderId, status: orderSuppliers.status })
    .from(orderSuppliers)
    .where(eq(orderSuppliers.id, partId))
    .for("update");

  if (!part) return { ok: false, reason: "NOT_FOUND" };
  if (!isPartDecidable(part.status)) {
    // `EXPIRED` sobre una `CONFIRMED` es la excepción: no la decide una persona,
    // la decide el reloj, y la parte ya había dicho que sí.
    const expiringConfirmed = status === "EXPIRED" && part.status === "CONFIRMED";
    if (!expiringConfirmed) return { ok: false, reason: "ALREADY_SETTLED" };
  }

  await tx
    .update(orderSuppliers)
    .set({
      status,
      // Se escribe solo al aceptar, y **nunca se borra**: es lo único que
      // distingue después al proveedor que venció callado del que venció tras
      // haber dicho que sí.
      ...(status === "CONFIRMED" ? { confirmedAt: now } : {}),
      ...(reason ? { declineReason: reason } : {}),
      decidedByUserId: actorUserId,
      updatedAt: now,
    })
    .where(eq(orderSuppliers.id, partId));

  // Aceptar no suelta nada —la mercancía sigue apartada, ahora con más razón—.
  // Los otros dos sí, y por el mismo ejecutor que acaba de marcar la parte.
  if (status !== "CONFIRMED") {
    await releaseReservations(partId, tx);
    return { ok: true, orderCancelled: await settleOrder(tx, part.orderId, now) };
  }

  return { ok: true, orderCancelled: false };
}

/**
 * Lo que le queda al pedido cuando una de sus partes se cae: una fecha nueva y,
 * a veces, el final.
 *
 * Devuelve si el pedido se canceló, que es lo que la pantalla necesita saber
 * para decir algo distinto de "una parte menos".
 */
async function settleOrder(tx: Tx, orderId: string, now: Date): Promise<boolean> {
  const parts = await tx
    .select({ status: orderSuppliers.status })
    .from(orderSuppliers)
    .where(eq(orderSuppliers.orderId, orderId));

  const [order] = await tx
    .select({ status: orders.status, expiresAt: orders.expiresAt })
    .from(orders)
    .where(eq(orders.id, orderId));

  // El plazo del pedido era el más temprano de sus reservas, y la que acaba de
  // soltarse podía ser justo esa. Con una menos, el mínimo se aleja.
  const [minimum] = (
    await tx.execute<{ next: string | null }>(sql`
      select min(r.expires_at) as next
        from stock_reservations r
        join order_suppliers os on os.id = r.order_supplier_id
       where os.order_id = ${orderId} and r.status = 'HELD'
    `)
  ).rows;

  const next = minimum?.next ? new Date(minimum.next) : null;
  // Solo puede alargarse. Sin reservas vivas no hay mínimo del que tirar y la
  // fecha se queda como estaba: un pedido de puros servicios vive con el default
  // de la plataforma, y acortarlo aquí sería quitarle tiempo al comprador por
  // algo que no hizo.
  if (next && next > order.expiresAt) {
    await tx.update(orders).set({ expiresAt: next, updatedAt: now }).where(eq(orders.id, orderId));
  }

  const status = nextOrderStatus({ current: order.status, parts });
  if (!status) return false;

  await tx.update(orders).set({ status, updatedAt: now }).where(eq(orders.id, orderId));
  return true;
}

export type ExpiryReport = {
  /** Partes que nadie contestó a tiempo. */
  silent: number;
  /** Partes aceptadas a las que se les acabó la reserva antes del pago. */
  stale: number;
  /** Pedidos que se quedaron sin ninguna parte viva. */
  cancelledOrders: number;
};

/**
 * Los dos relojes, que son distintos y acaban igual. Lo corre el cron.
 *
 * El primero cae sobre el proveedor que no contestó; el segundo, sobre el que
 * había aceptado y se quedó esperando un pago que no llegó. Los dos tumban **su
 * parte y solo la suya** —el resto del pedido sigue— y los dos sueltan su stock.
 *
 * Ninguno toca un pedido ya cobrado: sus reservas están consumidas, no retenidas,
 * y el reloj no le aplica. La condición está en el `where` y no después, porque
 * es la diferencia entre no hacer nada y deshacer una venta.
 */
export async function expireDueParts(now = new Date()): Promise<ExpiryReport> {
  // Solo mientras el dinero no haya entrado. Un `PAID` o un `COMPLETED` no vence,
  // y un `CANCELLED` ya no tiene nada que perder.
  const clockRuns = inArray(orders.status, ["PENDING_PAYMENT", "PAYMENT_REPORTED"] as const);

  const silent = await db
    .select({ id: orderSuppliers.id })
    .from(orderSuppliers)
    .innerJoin(orders, eq(orders.id, orderSuppliers.orderId))
    .where(
      and(
        eq(orderSuppliers.status, "PENDING"),
        lt(orderSuppliers.confirmationDueAt, now),
        clockRuns,
      ),
    );

  // La aceptada que ya no tiene su mercancía apartada.
  //
  // Se pregunta "no le queda ninguna reserva viva" y no "tiene una vencida", que
  // sería lo obvio y dejaría un agujero: el checkout suelta lo vencido de los
  // productos que va a pedir (`releaseExpiredForProducts`) sin saber de qué parte
  // eran, así que una parte confirmada puede quedarse sin reservas **y sin
  // ninguna vencida que la delate**. Quedaría `CONFIRMED` para siempre —el otro
  // reloj tampoco la mira— y al cobrar no habría nada que consumir: se vendería
  // aire.
  //
  // El primer `exists` es lo que salva a la parte de puros servicios: no reserva
  // nada, así que "sin reservas vivas" es su estado normal y no su final.
  const stale = (
    await db.execute<{ id: string }>(sql`
      select os.id
        from order_suppliers os
        join orders o on o.id = os.order_id
       where os.status = 'CONFIRMED'
         and o.status in ('PENDING_PAYMENT', 'PAYMENT_REPORTED')
         and exists (select 1 from stock_reservations r
                      where r.order_supplier_id = os.id)
         and not exists (select 1 from stock_reservations r
                          where r.order_supplier_id = os.id
                            and r.status = 'HELD'
                            and r.expires_at >= ${now})
    `)
  ).rows;

  let cancelledOrders = 0;
  for (const { id } of [...silent, ...stale]) {
    const result = await db.transaction((tx) =>
      settlePart(tx, { partId: id, status: "EXPIRED", actorUserId: null, now }),
    );
    if (result.ok && result.orderCancelled) cancelledOrders += 1;
  }

  return { silent: silent.length, stale: stale.length, cancelledOrders };
}
