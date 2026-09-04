import "server-only";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, orderSuppliers, orders, payments, products } from "@/lib/db/schema";
import { confirmationDueAt } from "@/lib/inventory/holds";
import { reservationPlan, type ReservationIntent } from "@/lib/inventory/reservation-plan";
import {
  releaseExpiredForProducts,
  reserveForPart,
} from "@/lib/inventory/reservations";
import { formatOrderNumber } from "./numbering";
import type { CheckoutProblem, PlaceableCart } from "./revalidate";

/**
 * Crear el pedido: la orden, sus partes, sus líneas y sus reservas.
 *
 * Todo en **una transacción**, que es la razón por la que el driver del proyecto
 * va por WebSocket (ver `lib/db/index.ts`). Un pedido con partes pero sin
 * reservas vendería lo que no hay; con reservas pero sin líneas retendría
 * mercancía que nadie pidió. No hay estado intermedio que valga.
 *
 * Lo que se escribe aquí ya viene decidido: `revalidateCart` releyó el catálogo y
 * dijo a qué precio y de quién es cada cosa. Este módulo no vuelve a opinar sobre
 * eso — solo lo copia como **snapshot**, para que un cambio de precio de mañana
 * no reescriba lo que alguien compró hoy.
 */

export type PlacedOrder = { id: string; orderNumber: string };

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; problems: CheckoutProblem[] };

/** Alguien se adelantó entre la revalidación y la reserva. */
class ShortfallError extends Error {
  constructor(
    readonly productIds: string[],
    readonly supplierName: string,
  ) {
    super("Sin stock al reservar");
  }
}

export async function placeOrder({
  cart,
  userId,
  contactName,
  contactPhone,
  deliveryAddress,
  notes,
  now = new Date(),
}: {
  cart: PlaceableCart;
  userId: string;
  contactName: string;
  contactPhone: string;
  deliveryAddress: string;
  notes: string | null;
  now?: Date;
}): Promise<PlaceOrderResult> {
  // Un kit retiene sus piezas, no el kit; el mismo panel puede llegar suelto y
  // dentro de un kit; un servicio no retiene nada. Todo eso lo decide
  // `reservationPlan`, y se hace por parte porque cada una tiene su plazo.
  const plans = new Map<string, ReservationIntent[]>();
  for (const group of cart.groups) {
    const plan = reservationPlan(group.lines, cart.compositions);

    // Saltárselo en silencio retendría de menos, que es exactamente cómo se
    // vende lo que no hay. Con `revalidateCart` delante no debería pasar nunca:
    // si pasa, es que la composición del kit cambió entre las dos lecturas.
    if (plan.unknownKits.length > 0) {
      return {
        ok: false,
        problems: [
          {
            kind: "gone",
            message: `Uno de los kits de ${group.supplierName} cambió mientras confirmabas. Vuelve al carrito y revísalo.`,
            supplierSlug: group.supplierSlug,
          },
        ],
      };
    }

    plans.set(group.supplierSlug, plan.intents);
  }

  // Antes de abrir la transacción, suelta lo que ya venció de estos productos.
  // Así el stock vuelve en el momento en que alguien lo necesita y no cuando
  // pase el cron —que en el plan Hobby de Vercel es una vez al día—, y la
  // transacción de abajo no arrastra este barrido si acaba revirtiéndose.
  await releaseExpiredForProducts(
    [...plans.values()].flat().map((intent) => intent.productId),
    now,
  );

  try {
    const order = await db.transaction(async (tx) => {
      const [sequence] = await tx
        .execute<{ value: string }>(sql`select nextval('order_number_seq') as value`)
        .then((result) => result.rows);

      const [created] = await tx
        .insert(orders)
        .values({
          orderNumber: formatOrderNumber(Number(sequence.value)),
          userId,
          zoneId: cart.zone.id,
          expiresAt: cart.window.expiresAt,
          subtotalUsd: cart.subtotalUsd,
          // Hoy no hay envío ni impuestos que sumar, así que las dos cifras
          // coinciden. Se escriben las dos igual: el día que se separen, lo que
          // se cobró no puede depender de reinterpretar una columna vieja.
          totalUsd: cart.subtotalUsd,
          // Lo que el comprador aceptó pagar es, al crear, lo que pidió. Las dos
          // se separan en cuanto una parte se cae.
          acknowledgedTotalUsd: cart.subtotalUsd,
          contactName,
          contactPhone,
          deliveryAddress,
          notes,
        })
        .returning({ id: orders.id, orderNumber: orders.orderNumber });

      for (const group of cart.groups) {
        const [part] = await tx
          .insert(orderSuppliers)
          .values({
            orderId: created.id,
            supplierId: group.supplierId,
            subtotalUsd: group.subtotalUsd,
            confirmationDueAt: confirmationDueAt(now, group.holdHours),
          })
          .returning({ id: orderSuppliers.id });

        await tx.insert(orderItems).values(
          group.lines.map((line) => ({
            orderSupplierId: part.id,
            itemType: line.type,
            itemId: line.id,
            nameSnapshot: line.name,
            priceSnapshotUsd: line.priceUsd,
            quantity: line.quantity,
          })),
        );

        const held = await reserveForPart(tx, {
          orderSupplierId: part.id,
          intents: plans.get(group.supplierSlug) ?? [],
          supplierHoldHours: group.holdHours,
          now,
        });

        // Entre la revalidación y este UPDATE cabe otra compra entera. Cae el
        // pedido completo, no la parte: nadie ha aceptado nada todavía, y
        // cobrarle a alguien un pedido recortado que no pidió es peor que
        // devolverlo al carrito.
        if (!held.ok) {
          throw new ShortfallError(
            held.shortfalls.map((shortfall) => shortfall.productId),
            group.supplierName,
          );
        }
      }

      // El pago nace con la orden y sin reporte: es la fila que el comprador
      // rellenará con su referencia de Zelle y la que el admin confirmará.
      await tx.insert(payments).values({ orderId: created.id });

      return created;
    });

    return { ok: true, order };
  } catch (error) {
    if (error instanceof ShortfallError) {
      return { ok: false, problems: [await describeShortfall(error)] };
    }
    throw error;
  }
}

/**
 * Qué se agotó, por su nombre.
 *
 * Vale una consulta más en el camino del error: el producto que faltó puede ser
 * una pieza de un kit, así que decir solo "algo se agotó" dejaría al comprador
 * mirando un carrito que se ve entero sin saber qué quitar.
 */
async function describeShortfall(error: ShortfallError): Promise<CheckoutProblem> {
  const rows = await db
    .select({ name: products.name })
    .from(products)
    .where(inArray(products.id, error.productIds));

  const missing = rows.map((row) => `«${row.name}»`).join(", ");

  return {
    kind: "stock",
    message: missing
      ? `Se agotó ${missing} mientras confirmabas el pedido. Vuelve al carrito y revísalo.`
      : `Algo de ${error.supplierName} se agotó mientras confirmabas el pedido.`,
    supplierSlug: null,
  };
}
