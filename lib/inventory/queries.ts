import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, restocks, stockAlerts, stockMovements } from "@/lib/db/schema";
import { availableUnits } from "./availability";

/** Lo que el panel de un producto necesita saber de su inventario. */
export type StockPanel = {
  stock: number;
  reserved: number;
  /** `stock - reserved`: lo que de verdad se puede vender. */
  available: number;
  movements: MovementRow[];
  restocks: RestockRow[];
};

export type MovementRow = {
  id: string;
  delta: number;
  reason: (typeof stockMovements.$inferSelect)["reason"];
  note: string | null;
  occurredAt: Date;
  /** Quién lo hizo de verdad, o `null` si fue el sistema. */
  actorName: string | null;
  /** En nombre de qué proveedor, si actuaba por otro. */
  onBehalfOfName: string | null;
};

export type RestockRow = typeof restocks.$inferSelect;

/** Cuántos movimientos se enseñan de un tirón. El resto es historia vieja. */
const MOVEMENT_PAGE = 30;

/**
 * El inventario de un producto para el panel del admin.
 *
 * Las tres lecturas van en paralelo: con Neon por HTTP, encadenarlas serían tres
 * latencias en vez de una.
 *
 * El histórico llega recortado a propósito — un producto con dos años de ventas
 * tiene miles de movimientos y la pantalla solo enseña los últimos. La suma que
 * sostiene la invariante **no** sale de aquí: se calcula en Postgres
 * (`check:inventory`), no en Node sobre una página.
 */
export async function getStockPanel(productId: string): Promise<StockPanel | null> {
  const [product, movements, announced] = await Promise.all([
    db.query.products.findFirst({
      where: eq(products.id, productId),
      columns: { stock: true, reserved: true },
    }),
    db.query.stockMovements.findMany({
      where: eq(stockMovements.productId, productId),
      orderBy: [desc(stockMovements.occurredAt)],
      limit: MOVEMENT_PAGE,
      with: {
        actor: { columns: { name: true } },
        onBehalfOf: { columns: { name: true } },
      },
    }),
    db.query.restocks.findMany({
      where: eq(restocks.productId, productId),
      orderBy: [desc(restocks.createdAt)],
    }),
  ]);

  if (!product) return null;

  return {
    stock: product.stock,
    reserved: product.reserved,
    available: availableUnits(product),
    movements: movements.map(({ actor, onBehalfOf, ...movement }) => ({
      id: movement.id,
      delta: movement.delta,
      reason: movement.reason,
      note: movement.note,
      occurredAt: movement.occurredAt,
      actorName: actor?.name ?? null,
      onBehalfOfName: onBehalfOf?.name ?? null,
    })),
    restocks: announced,
  };
}

/**
 * ¿Este usuario ya pidió que le avisemos de este producto?
 *
 * Decide si el botón dice "avísame" o "te avisaremos". Se pregunta solo cuando
 * hay sesión y el producto está agotado — no en cada visita al catálogo.
 */
export async function isWatchingProduct(
  productId: string,
  userId: string,
): Promise<boolean> {
  const row = await db.query.stockAlerts.findFirst({
    where: and(
      eq(stockAlerts.productId, productId),
      eq(stockAlerts.userId, userId),
    ),
    columns: { id: true },
  });
  return row != null;
}
