import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { restocks, stockMovements } from "@/lib/db/schema";

/**
 * El **único** sitio que escribe stock.
 *
 * Toda entrada pasa por aquí y toda entrada deja fila en el libro mayor: es lo
 * que sostiene la invariante `products.stock = sum(stock_movements.delta)`, y
 * por eso el formulario de producto ya no toca la columna. Ver ARCHITECTURE §4.
 *
 * Ninguna de estas funciones lee sesión ni revalida rutas — eso es de la Server
 * Action que las llama. Aquí solo está la escritura y su regla.
 */

/** Quién hace el movimiento, para que el histórico no mienta al suplantar. */
export type Actor = {
  /** El usuario real. Nulo cuando escribe el cron. */
  actorUserId?: string | null;
  /** En nombre de qué proveedor actuaba, si actuaba por otro. */
  onBehalfOfSupplierId?: string | null;
};

type MovementReason =
  | "OPENING"
  | "RESTOCK"
  | "SALE"
  | "RELEASE"
  | "ADJUSTMENT"
  | "LOSS"
  | "RETURN";

/**
 * Recalcula el saldo **desde el libro**, no sumándole el delta.
 *
 * La diferencia importa: `stock = stock + delta` acumula el error si se ejecuta
 * dos veces o se queda a medias, y `neon-http` no da transacciones para
 * impedirlo. Recomputar es idempotente — correrlo de nuevo siempre converge a la
 * verdad, así que un fallo entre la fila y el saldo se arregla repitiendo.
 *
 * Va en SQL literal y no con el constructor de drizzle a propósito: en un
 * `update` de una sola tabla, drizzle renderiza las columnas sin cualificar y
 * `m.product_id = p.id` se convertiría en `product_id = id`, con las dos
 * resolviendo contra la tabla de dentro. No falla: devuelve siempre lo mismo.
 * Es la trampa que documenta ARCHITECTURE §3.
 */
export async function syncStockBalance(productId: string): Promise<void> {
  await db.execute(sql`
    update products p
       set stock = (
             select coalesce(sum(m.delta), 0)::int
               from stock_movements m
              where m.product_id = p.id
           ),
           updated_at = now()
     where p.id = ${productId}
  `);
}

/** Deja el saldo de **todos** los productos igual a su libro. La red de seguridad. */
export async function repairAllBalances(): Promise<number> {
  const result = await db.execute(sql`
    update products p
       set stock = c.total, updated_at = now()
      from (
            select pr.id,
                   coalesce(sum(m.delta), 0)::int as total
              from products pr
              left join stock_movements m on m.product_id = pr.id
             group by pr.id
           ) c
     where c.id = p.id and p.stock <> c.total
  `);
  return result.rowCount ?? 0;
}

/**
 * Escribe un movimiento y deja el saldo al día.
 *
 * En este orden: primero la explicación, después el saldo. Si algo se cae en
 * medio queda un movimiento sin reflejar —detectable con
 * `npm run check:inventory` y arreglable con `repairAllBalances`—, que es mejor
 * que un saldo cambiado que nadie sabe por qué.
 */
export async function recordMovement({
  productId,
  delta,
  reason,
  note,
  orderSupplierId,
  actorUserId,
  onBehalfOfSupplierId,
}: Actor & {
  productId: string;
  delta: number;
  reason: MovementReason;
  note?: string | null;
  orderSupplierId?: string | null;
}): Promise<void> {
  await db.insert(stockMovements).values({
    productId,
    delta,
    reason,
    note: note ?? null,
    orderSupplierId: orderSupplierId ?? null,
    actorUserId: actorUserId ?? null,
    onBehalfOfSupplierId: onBehalfOfSupplierId ?? null,
  });

  await syncStockBalance(productId);
}

/**
 * El saldo de apertura de un producto recién creado.
 *
 * Sin esto, un producto nuevo nacería con `stock` a mano y el libro vacío — la
 * invariante rota desde el primer minuto. Es el mismo `OPENING` que la migración
 * `0007` escribió para los que ya existían.
 */
export async function openLedger(
  productId: string,
  units: number,
  actor: Actor = {},
): Promise<void> {
  await recordMovement({
    ...actor,
    productId,
    delta: units,
    reason: "OPENING",
    note: "Existencias iniciales al crear el producto",
  });
}

/** Una reposición anunciada. No toca el saldo: es una promesa, no un hecho. */
export async function announceRestock({
  productId,
  quantity,
  etaFrom,
  etaTo,
  note,
  createdBy,
}: {
  productId: string;
  quantity: number;
  etaFrom: string;
  etaTo: string;
  note?: string | null;
  createdBy?: string | null;
}): Promise<void> {
  await db.insert(restocks).values({
    productId,
    quantity,
    etaFrom,
    etaTo,
    note: note ?? null,
    createdBy: createdBy ?? null,
  });
}

/**
 * La reposición llegó.
 *
 * Dos hechos y no uno: la fila pasa a `ARRIVED` **y** se escribe un `RESTOCK`
 * con lo que de verdad entró, que puede no ser lo que se anunció. Esa distancia,
 * acumulada, es la que dice qué proveedor cumple lo que promete — si se
 * sobrescribiera la cantidad anunciada se perdería.
 */
export async function resolveRestock({
  restockId,
  arrivedUnits,
  ...actor
}: Actor & { restockId: string; arrivedUnits: number }): Promise<
  { ok: true } | { ok: false; reason: "not-found" | "already-resolved" }
> {
  const restock = await db.query.restocks.findFirst({
    where: eq(restocks.id, restockId),
    columns: { id: true, productId: true, status: true },
  });
  if (!restock) return { ok: false, reason: "not-found" };
  if (restock.status !== "ANNOUNCED") {
    return { ok: false, reason: "already-resolved" };
  }

  await db
    .update(restocks)
    .set({ status: "ARRIVED", resolvedAt: new Date() })
    .where(eq(restocks.id, restockId));

  if (arrivedUnits > 0) {
    await recordMovement({
      ...actor,
      productId: restock.productId,
      delta: arrivedUnits,
      reason: "RESTOCK",
      note: "Llegada de reposición anunciada",
    });
  }

  return { ok: true };
}

/** El proveedor la retira antes de que llegue. Tampoco toca el saldo. */
export async function cancelRestock(
  restockId: string,
): Promise<{ ok: true } | { ok: false; reason: "not-found" | "already-resolved" }> {
  const restock = await db.query.restocks.findFirst({
    where: eq(restocks.id, restockId),
    columns: { id: true, status: true },
  });
  if (!restock) return { ok: false, reason: "not-found" };
  if (restock.status !== "ANNOUNCED") {
    return { ok: false, reason: "already-resolved" };
  }

  await db
    .update(restocks)
    .set({ status: "CANCELLED", resolvedAt: new Date() })
    .where(eq(restocks.id, restockId));

  return { ok: true };
}
