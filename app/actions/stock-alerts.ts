"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { products, stockAlerts } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { idSchema, type ActionState } from "@/lib/forms";

export type StockAlertState = ActionState;

/**
 * «Avísame cuando vuelva».
 *
 * Es lo que se ofrece **en lugar de** la pre-orden, que queda fuera de la Fase 1:
 * con pago manual, vender lo que no ha llegado sería cobrar por adelantado contra
 * una fecha que nosotros mismos presentamos como aproximada. Esto captura la
 * demanda sin tocar dinero — y de paso le dice al proveedor cuánto pedir.
 *
 * Pide sesión porque el aviso va a una persona: `stock_alerts.userId` es la
 * dirección a la que se manda. Sin ella no habría dónde escribir.
 */

const watchSchema = z.object({ productId: idSchema, slug: z.string() });

export async function watchProduct(
  _state: StockAlertState,
  formData: FormData,
): Promise<StockAlertState> {
  const session = await getSession();
  if (!session) return { message: "Inicia sesión para que podamos avisarte." };

  const parsed = watchSchema.safeParse({
    productId: formData.get("productId"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return { message: "Producto inválido." };

  const product = await db.query.products.findFirst({
    where: eq(products.id, parsed.data.productId),
    columns: { id: true },
  });
  if (!product) return { message: "Ese producto ya no existe." };

  // `onConflictDoNothing` sobre el único par: apuntarse dos veces al mismo
  // producto no significa nada, y pulsar el botón de nuevo no debe fallar.
  await db
    .insert(stockAlerts)
    .values({ productId: parsed.data.productId, userId: session.userId })
    .onConflictDoNothing();

  revalidatePath(`/catalog/products/${parsed.data.slug}`);
  return { success: true };
}

export async function unwatchProduct(
  _state: StockAlertState,
  formData: FormData,
): Promise<StockAlertState> {
  const session = await getSession();
  if (!session) return { message: "No autorizado." };

  const parsed = watchSchema.safeParse({
    productId: formData.get("productId"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return { message: "Producto inválido." };

  await db
    .delete(stockAlerts)
    .where(
      and(
        eq(stockAlerts.productId, parsed.data.productId),
        eq(stockAlerts.userId, session.userId),
      ),
    );

  revalidatePath(`/catalog/products/${parsed.data.slug}`);
  return { success: true };
}
