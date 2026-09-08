import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { confirmationProgress, liveTotalUsd, paymentGate } from "./decisions";

/**
 * Los pedidos como los ve quien los hizo.
 *
 * Siempre acotado por `userId` **en la consulta**, no comprobado después: un
 * pedido lleva el teléfono y la dirección de una persona, y el número corto
 * (`SOL-1042`) es adivinable a propósito porque se dicta por teléfono. Filtrar
 * al leer es lo que impide que sirva para mirar el pedido de otro.
 *
 * Lo que se enseña es **el pedido que se hizo**, entero: nada se recorta ni
 * desaparece. Cada parte lleva al lado lo que le pasó, y las caídas se quedan en
 * la lista — un pedido que encoge solo es el que genera la llamada.
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
  /** El marcador «2 de 3 confirmados» que se mira mientras se espera. */
  progress: ReturnType<typeof confirmationProgress>;
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
    liveTotalUsd: liveTotalUsd(row.parts),
    progress: confirmationProgress(row.parts),
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

  return {
    ...order,
    liveTotalUsd: liveTotalUsd(order.parts),
    progress: confirmationProgress(order.parts),
  };
}

/**
 * Los pedidos como los ve el admin: todos, y con la puerta del cobro ya resuelta.
 *
 * La diferencia con las de arriba no es el filtro sino **qué pregunta responden**.
 * Al comprador se le enseña en qué va lo suyo; aquí se enseña qué hay que hacer:
 * a quién llamar porque no ha confirmado, y qué pedido está listo para cobrarse.
 * Por eso la fila trae el motivo del bloqueo y no un booleano — «1 proveedor sin
 * confirmar» dice a quién llamar, «no se puede» no.
 */

export type AdminOrderRow = Awaited<ReturnType<typeof getAdminOrders>>[number];

export async function getAdminOrders() {
  const rows = await db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    with: {
      user: { columns: { email: true } },
      parts: {
        columns: { id: true, subtotalUsd: true, status: true },
        with: { supplier: { columns: { name: true } } },
      },
    },
  });

  return rows.map((row) => ({
    ...row,
    liveTotalUsd: liveTotalUsd(row.parts),
    progress: confirmationProgress(row.parts),
    gate: paymentGate({
      parts: row.parts,
      acknowledgedTotalUsd: row.acknowledgedTotalUsd,
    }),
  }));
}

export type AdminOrderDetail = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

export async function getAdminOrder(orderNumber: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      user: { columns: { email: true, name: true } },
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

  return {
    ...order,
    liveTotalUsd: liveTotalUsd(order.parts),
    progress: confirmationProgress(order.parts),
    gate: paymentGate({
      parts: order.parts,
      acknowledgedTotalUsd: order.acknowledgedTotalUsd,
    }),
  };
}
