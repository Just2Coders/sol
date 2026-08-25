import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, stockReservations } from "@/lib/db/schema";
import { reservationExpiresAt } from "./holds";
import { recordMovement, syncStockBalance, type Actor } from "./service";
import type { ReservationIntent } from "./reservation-plan";

/**
 * El ciclo de vida de una reserva: retener, consumir o soltar.
 *
 * Retener es lo que impide que dos personas compren el último panel mientras un
 * Zelle tarda días en verificarse. Lo retenido **no baja el saldo** —la mercancía
 * sigue en el almacén— sino que sube `products.reserved`, y lo vendible es la
 * resta.
 *
 * Invariante que sostiene todo esto: `products.reserved = sum(quantity)` de las
 * reservas `HELD`. La comprueba `npm run check:inventory`.
 */

/** Qué producto no cabía y cuánto se pedía de él. */
export type ReservationShortfall = { productId: string; requested: number };

export type ReserveResult =
  | { ok: true }
  | { ok: false; shortfalls: ReservationShortfall[] };

/**
 * Retiene lo que pide un pedido, o no retiene nada.
 *
 * Todo dentro de **una transacción**: si una sola pieza falta se revierte lo ya
 * retenido, porque un pedido a medio reservar es peor que uno que no nace. Es
 * justo lo que `neon-http` no permitía y por lo que el driver cambió.
 *
 * La puerta de la concurrencia es la condición del `UPDATE`, no una lectura
 * previa: entre un `SELECT` que dice "queda uno" y el `UPDATE` que lo aparta cabe
 * otra petición entera. Con `where stock - reserved >= n` la comprobación y la
 * escritura son el mismo acto, y quien llega segundo se lleva cero filas.
 *
 * Las intenciones llegan **ordenadas por `productId`** desde `reservationPlan`,
 * que es lo que evita que dos checkouts simultáneos se bloqueen en orden
 * distinto.
 */
export async function reserveForPart({
  orderSupplierId,
  intents,
  supplierHoldHours,
  now = new Date(),
}: {
  orderSupplierId: string;
  intents: ReservationIntent[];
  /** El del proveedor de esta parte; `null` = el default de la plataforma. */
  supplierHoldHours: number | null;
  now?: Date;
}): Promise<ReserveResult> {
  if (intents.length === 0) return { ok: true };

  // Antes de retener, suelta lo que ya venció **de estos productos**.
  //
  // Sin esto, la corrección dependería de cada cuánto corre el cron — y en el
  // plan Hobby de Vercel eso es una vez al día, así que un carrito abandonado
  // bloquearía una unidad hasta 24 h de más. Con esto, quien intenta comprar
  // libera él mismo lo caducado y el cron pasa a ser red de seguridad.
  await releaseExpiredForProducts(
    intents.map((intent) => intent.productId),
    now,
  );

  // Absoluto y escrito una vez: cambiar el ajuste del proveedor mañana no mueve
  // esta reserva, igual que el snapshot de precio de `order_items`.
  const expiresAt = reservationExpiresAt(now, supplierHoldHours);

  try {
    await db.transaction(async (tx) => {
      for (const intent of intents) {
        const taken = await tx.execute(sql`
          update products
             set reserved = reserved + ${intent.units}
           where id = ${intent.productId}
             and stock - reserved >= ${intent.units}
          returning id
        `);

        // Cero filas = no había. Se revierte todo lo retenido antes.
        if ((taken.rowCount ?? 0) === 0) tx.rollback();

        await tx.insert(stockReservations).values({
          orderSupplierId,
          productId: intent.productId,
          quantity: intent.units,
          expiresAt,
        });
      }
    });

    return { ok: true };
  } catch {
    // `tx.rollback()` sale por excepción. Volver a mirar qué falta es una
    // consulta barata y evita arrastrar estado a través del throw — y de paso el
    // mensaje dice lo que hay **ahora**, no lo que había al empezar.
    return { ok: false, shortfalls: await missingFor(intents) };
  }
}

/** Qué intenciones no caben ahora mismo. Para el mensaje, no para decidir. */
async function missingFor(
  intents: ReservationIntent[],
): Promise<ReservationShortfall[]> {
  const rows = await db
    .select({
      id: products.id,
      available: sql<number>`greatest(${products.stock} - ${products.reserved}, 0)`,
    })
    .from(products)
    .where(
      inArray(
        products.id,
        intents.map((intent) => intent.productId),
      ),
    );

  const available = new Map(rows.map((row) => [row.id, Number(row.available)]));

  return intents
    .filter((intent) => (available.get(intent.productId) ?? 0) < intent.units)
    .map((intent) => ({ productId: intent.productId, requested: intent.units }));
}

/**
 * El pago se confirmó: lo retenido pasa a vendido.
 *
 * Aquí sí baja el saldo, y con un movimiento `SALE` que lo explica — hasta este
 * momento la mercancía seguía en el almacén, solo que apartada.
 */
export async function consumeReservations(
  orderSupplierId: string,
  actor: Actor = {},
): Promise<number> {
  const held = await db
    .select({
      id: stockReservations.id,
      productId: stockReservations.productId,
      quantity: stockReservations.quantity,
    })
    .from(stockReservations)
    .where(
      and(
        eq(stockReservations.orderSupplierId, orderSupplierId),
        eq(stockReservations.status, "HELD"),
      ),
    );

  for (const reservation of held) {
    await db
      .update(stockReservations)
      .set({ status: "CONSUMED", resolvedAt: new Date() })
      .where(eq(stockReservations.id, reservation.id));

    // Primero suelta la retención y después baja el saldo: si se hiciera al
    // revés, entre las dos escrituras el producto contaría dos veces la misma
    // venta —una en `stock` y otra en `reserved`— y se vería agotado sin estarlo.
    await syncReservedBalance(reservation.productId);

    await recordMovement({
      ...actor,
      productId: reservation.productId,
      delta: -reservation.quantity,
      reason: "SALE",
      orderSupplierId,
      note: "Pedido cobrado",
    });
  }

  return held.length;
}

/**
 * Suelta lo retenido por una parte que se cayó — rechazada, cancelada o vencida.
 *
 * **No escribe movimiento**: soltar no toca `stock`, solo `reserved`. La
 * mercancía nunca salió del almacén, así que el libro mayor no tiene nada que
 * contar.
 */
export async function releaseReservations(orderSupplierId: string): Promise<number> {
  const released = await db
    .update(stockReservations)
    .set({ status: "RELEASED", resolvedAt: new Date() })
    .where(
      and(
        eq(stockReservations.orderSupplierId, orderSupplierId),
        eq(stockReservations.status, "HELD"),
      ),
    )
    .returning({ productId: stockReservations.productId });

  for (const productId of new Set(released.map((row) => row.productId))) {
    await syncReservedBalance(productId);
  }
  return released.length;
}

/**
 * Suelta lo vencido **de unos productos concretos**.
 *
 * La versión acotada de `releaseExpiredReservations`, para el camino caliente:
 * el checkout solo necesita desbloquear lo que va a pedir, no barrer el catálogo
 * entero.
 */
export async function releaseExpiredForProducts(
  productIds: string[],
  now = new Date(),
): Promise<number> {
  if (productIds.length === 0) return 0;

  const released = await db
    .update(stockReservations)
    .set({ status: "RELEASED", resolvedAt: now })
    .where(
      and(
        eq(stockReservations.status, "HELD"),
        lt(stockReservations.expiresAt, now),
        inArray(stockReservations.productId, productIds),
      ),
    )
    .returning({ productId: stockReservations.productId });

  for (const productId of new Set(released.map((row) => row.productId))) {
    await syncReservedBalance(productId);
  }
  return released.length;
}

/**
 * Suelta todas las reservas vencidas. Lo corre el cron.
 *
 * Es lo que impide que un carrito abandonado mate una unidad para siempre: sin
 * esto, quien empieza un checkout y no paga se lleva el stock con él.
 */
export async function releaseExpiredReservations(now = new Date()): Promise<number> {
  const released = await db
    .update(stockReservations)
    .set({ status: "RELEASED", resolvedAt: now })
    .where(
      and(eq(stockReservations.status, "HELD"), lt(stockReservations.expiresAt, now)),
    )
    .returning({ productId: stockReservations.productId });

  for (const productId of new Set(released.map((row) => row.productId))) {
    await syncReservedBalance(productId);
  }
  return released.length;
}

/**
 * Recalcula `reserved` **desde las filas**, no sumándole un delta.
 *
 * Misma disciplina que `syncStockBalance`: recomputar converge siempre, así que
 * repetirlo arregla en vez de acumular. En SQL literal por la trampa de
 * cualificación de drizzle en un `update` de una sola tabla (ARCHITECTURE §3).
 */
export async function syncReservedBalance(productId: string): Promise<void> {
  await db.execute(sql`
    update products p
       set reserved = (
             select coalesce(sum(r.quantity), 0)::int
               from stock_reservations r
              where r.product_id = p.id and r.status = 'HELD'
           )
     where p.id = ${productId}
  `);
}

/** Deja `reserved` de todos los productos igual a sus reservas vivas. */
export async function repairReservedBalances(): Promise<number> {
  const result = await db.execute(sql`
    update products p
       set reserved = c.total
      from (
            select pr.id,
                   coalesce(sum(r.quantity) filter (where r.status = 'HELD'), 0)::int as total
              from products pr
              left join stock_reservations r on r.product_id = pr.id
             group by pr.id
           ) c
     where c.id = p.id and p.reserved <> c.total
  `);
  return result.rowCount ?? 0;
}

export { syncStockBalance };
