import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceSchedules } from "@/lib/db/schema";

/**
 * El **único** sitio que escribe precio.
 *
 * Mismo trato que el stock: `price_schedules` es la verdad y la columna
 * `price_usd` de cada tabla es su caché. Escribir la columna sin dejar fila en la
 * línea de tiempo rompe la invariante y borra el histórico, así que todo pasa por
 * aquí.
 *
 * `targetId` es una FK blanda a tres tablas según `targetType`, igual que
 * `order_items.itemId`.
 */

export type Priceable = "PRODUCT" | "KIT" | "SERVICE";

/**
 * La primera fila de la línea de tiempo de un item recién creado.
 *
 * Sin esto un item nace con precio en la columna y sin historia — que es
 * exactamente el descuadre que `npm run check:inventory` detectó en el primer
 * producto creado por el formulario después de la migración `0007`.
 */
export async function openPriceTimeline(
  targetType: Priceable,
  targetId: string,
  priceUsd: number,
  createdBy?: string | null,
): Promise<void> {
  await db.insert(priceSchedules).values({
    targetType,
    targetId,
    priceUsd,
    startsAt: new Date(),
    note: "Precio inicial al crear el item",
    createdBy: createdBy ?? null,
  });
}

/**
 * Un cambio de precio que rige **desde ya**.
 *
 * Es lo que hace el formulario al guardar: además de la columna, deja la fila que
 * explica desde cuándo. No escribe nada si el precio no cambió — una fila que
 * repite el precio anterior solo ensucia el histórico.
 */
export async function recordPriceChange(
  targetType: Priceable,
  targetId: string,
  priceUsd: number,
  createdBy?: string | null,
): Promise<void> {
  const [current] = await db
    .select({ priceUsd: priceSchedules.priceUsd })
    .from(priceSchedules)
    .where(
      and(
        eq(priceSchedules.targetType, targetType),
        eq(priceSchedules.targetId, targetId),
        sql`${priceSchedules.startsAt} <= now()`,
      ),
    )
    .orderBy(desc(priceSchedules.startsAt))
    .limit(1);

  if (current && current.priceUsd === priceUsd) return;

  await db.insert(priceSchedules).values({
    targetType,
    targetId,
    priceUsd,
    startsAt: new Date(),
    createdBy: createdBy ?? null,
  });
}

/**
 * Pone la caché de cada tabla al día con su línea de tiempo.
 *
 * Lo corre el cron. Idempotente y en una sola sentencia por tabla: el precio
 * efectivo es el de mayor `starts_at` que ya haya empezado —eso es lo que hace el
 * `distinct on`— y solo se escribe donde difiere, para no tocar filas que ya
 * están bien.
 *
 * Va en SQL literal, no por el constructor de drizzle: es un `update ... from`
 * correlacionado, y en esa forma drizzle renderiza las columnas sin cualificar
 * (ARCHITECTURE §3).
 */
export async function promoteDuePrices(): Promise<number> {
  let promoted = 0;

  for (const kind of ["PRODUCT", "KIT", "SERVICE"] as const) {
    const table = { PRODUCT: "products", KIT: "kits", SERVICE: "services" }[kind];
    const result = await db.execute(sql`
      update ${sql.raw(`"${table}"`)} t
         set price_usd = e.price_usd
        from (
              select distinct on (target_id) target_id, price_usd
                from price_schedules
               where target_type = ${kind}::priceable_type and starts_at <= now()
               order by target_id, starts_at desc
             ) e
       where e.target_id = t.id and t.price_usd is distinct from e.price_usd
    `);
    promoted += result.rowCount ?? 0;
  }

  return promoted;
}

/**
 * Rellena la línea de tiempo de los items que no la tengan.
 *
 * La red de seguridad del mismo tipo que `repairAllBalances()`: si algo creó un
 * item sin pasar por aquí, esto lo deja coherente sin inventarse un precio —
 * copia el que ya tiene la columna, fechado en su creación.
 */
export async function repairMissingTimelines(): Promise<number> {
  let repaired = 0;

  for (const [kind, table] of [
    ["PRODUCT", "products"],
    ["KIT", "kits"],
    ["SERVICE", "services"],
  ] as const) {
    const result = await db.execute(sql`
      insert into price_schedules (target_type, target_id, price_usd, starts_at, note)
      select ${kind}::priceable_type, t.id, t.price_usd, t.created_at,
             'Precio vigente al reparar la línea de tiempo'
        from ${sql.raw(`"${table}"`)} t
       where not exists (
         select 1 from price_schedules s
          where s.target_type = ${kind}::priceable_type and s.target_id = t.id
       )
    `);
    repaired += result.rowCount ?? 0;
  }

  return repaired;
}
