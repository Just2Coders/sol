import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { restocks } from "@/lib/db/schema";
import { promoteDuePrices } from "@/lib/pricing/service";
import { isoDay } from "./restocks";
import { releaseExpiredReservations } from "./reservations";

/**
 * Lo que tiene que pasar sin que nadie lo pida.
 *
 * Vive aparte del Route Handler para que el trabajo se pueda ejecutar desde un
 * script sin fingir una petición HTTP — que es como se prueba.
 *
 * **Los tres barridos son idempotentes**: correrlos dos veces seguidas no cambia
 * nada la segunda vez. Es lo que permite que el cron reintente sin miedo y que un
 * despliegue a medias no descuadre nada.
 */

export type SweepReport = {
  /** Reservas vencidas que devolvieron su stock. */
  releasedReservations: number;
  /** Anuncios cuya ventana quedó atrás. */
  expiredRestocks: number;
  /** Items cuya caché de precio se puso al día con su línea de tiempo. */
  promotedPrices: number;
};

export async function runSweep(now = new Date()): Promise<SweepReport> {
  // 1 — Lo que impide que un carrito abandonado mate una unidad para siempre.
  const releasedReservations = await releaseExpiredReservations(now);

  // 2 — El catálogo ya dejó de enseñar estos anuncios al filtrar por ventana;
  // marcarlos es para que el proveedor los vea en su lista y los resuelva.
  // Ocultar no es cerrar.
  const expired = await db
    .update(restocks)
    .set({ status: "EXPIRED", resolvedAt: now })
    .where(
      and(
        eq(restocks.status, "ANNOUNCED"),
        lt(restocks.etaTo, isoDay(now)),
      ),
    )
    .returning({ id: restocks.id });

  // 3 — La caché de precio se pone al día con el schedule. Que esto llegue tarde
  // nunca cobra mal: el checkout relee la línea de tiempo, no la caché.
  const promotedPrices = await promoteDuePrices();

  return {
    releasedReservations,
    expiredRestocks: expired.length,
    promotedPrices,
  };
}

/**
 * Las dos invariantes, comprobadas después de barrer.
 *
 * No repara nada: solo cuenta lo que no cuadra, para que el cron lo deje escrito
 * en sus logs. Reparar en silencio escondería el bug que lo causó.
 */
export async function countDrift(): Promise<{ stock: number; reserved: number }> {
  const [row] = (
    await db.execute(sql`
      select
        (select count(*)::int from products p
          where p.stock <> (select coalesce(sum(m.delta), 0)::int
                              from stock_movements m where m.product_id = p.id)) as stock,
        (select count(*)::int from products p
          where p.reserved <> (select coalesce(sum(r.quantity), 0)::int
                                 from stock_reservations r
                                where r.product_id = p.id and r.status = 'HELD')) as reserved
    `)
  ).rows as { stock: number; reserved: number }[];

  return { stock: Number(row.stock), reserved: Number(row.reserved) };
}
