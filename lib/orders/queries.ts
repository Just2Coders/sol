import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

/**
 * Los pedidos como los ve quien los hizo.
 *
 * Siempre acotado por `userId` **en la consulta**, no comprobado después: un
 * pedido lleva el teléfono y la dirección de una persona, y el número corto
 * (`SOL-1042`) es adivinable a propósito porque se dicta por teléfono. Filtrar
 * al leer es lo que impide que sirva para mirar el pedido de otro.
 *
 * Lo que se enseña es **el pedido que se hizo**, entero: nada se recorta ni
 * desaparece. Con la confirmación de partes (Etapa 7) cada línea llevará al lado
 * lo que le pasó; hoy todas están vivas porque todavía no hay quien las tumbe.
 */

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: (typeof orders.$inferSelect)["status"];
  totalUsd: number;
  /** Lo que se pagaría hoy: la suma de las partes vivas. Hoy, el total. */
  liveTotalUsd: number;
  expiresAt: Date;
  createdAt: Date;
  /** Cuántos proveedores entregan este pedido. */
  partCount: number;
};

export async function getUserOrders(userId: string): Promise<OrderSummary[]> {
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: [desc(orders.createdAt)],
    columns: {
      id: true,
      orderNumber: true,
      status: true,
      totalUsd: true,
      expiresAt: true,
      createdAt: true,
    },
    with: { parts: { columns: { id: true, subtotalUsd: true, status: true } } },
  });

  return rows.map((row) => ({
    ...row,
    partCount: row.parts.length,
    liveTotalUsd: liveTotal(row.parts),
  }));
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getUserOrder>>>;

export async function getUserOrder(userId: string, orderNumber: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber)),
    with: {
      zone: { columns: { name: true } },
      parts: {
        with: {
          supplier: { columns: { name: true, slug: true, phone: true } },
          items: true,
        },
      },
    },
  });
  if (!order) return null;

  return { ...order, liveTotalUsd: liveTotal(order.parts) };
}

/**
 * Lo que se pagaría hoy: la suma de las partes que siguen en pie.
 *
 * Se calcula y no se guarda, a propósito. Conviven tres cifras que dicen tres
 * cosas distintas —lo que se pidió (`totalUsd`, inmutable), esto, y lo que el
 * comprador aceptó pagar (`acknowledgedTotalUsd`)— y guardar la del medio
 * obligaría a mantenerla sincronizada con cada parte que se cae.
 */
function liveTotal(parts: { subtotalUsd: number; status: string }[]): number {
  const total = parts
    .filter((part) => part.status !== "CANCELLED")
    .reduce((sum, part) => sum + part.subtotalUsd, 0);
  return Math.round(total * 100) / 100;
}
