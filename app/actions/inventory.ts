"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import {
  ADJUSTMENT_MESSAGE,
  checkAdjustment,
  checkRestockWindow,
  deltaForCount,
  MAX_MOVEMENT,
  RESTOCK_MESSAGE,
} from "@/lib/inventory/adjustments";
import { isoDay } from "@/lib/inventory/restocks";
import {
  announceRestock,
  cancelRestock,
  recordMovement,
  resolveRestock,
} from "@/lib/inventory/service";
import { idSchema, optionalText, quantitySchema, type ActionState } from "@/lib/forms";

export type InventoryFormState = ActionState;

/**
 * Las mutaciones de inventario del panel.
 *
 * Finas a propósito: validan, llaman al service y revalidan. La regla de qué es
 * un ajuste válido vive en `lib/inventory/adjustments.ts` (pura, con tests) y la
 * escritura en `lib/inventory/service.ts` — aquí no hay lógica que probar.
 */

function revalidateProduct(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  // Lo que hay disponible cambia lo que el catálogo enseña como agotado.
  revalidatePath("/catalog");
  revalidatePath("/catalog/products/[slug]", "page");
}

const recountSchema = z.object({
  productId: idSchema,
  countedUnits: quantitySchema(0),
  note: optionalText,
});

/**
 * El recuento del almacén.
 *
 * Se pregunta **cuánto hay**, no cuánto ha cambiado: a un almacén se le cuenta,
 * y la diferencia contra el libro la saca el sistema. Esa diferencia es la que
 * se anota como `ADJUSTMENT`.
 */
export async function recountStock(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const admin = await verifyAdmin();

  const parsed = recountSchema.safeParse({
    productId: formData.get("productId"),
    countedUnits: formData.get("countedUnits"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { productId, countedUnits, note } = parsed.data;

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { stock: true, supplierId: true },
  });
  if (!product) return { message: "El producto ya no existe." };

  const delta = deltaForCount(product.stock, countedUnits);
  const problem = checkAdjustment(product.stock, delta);
  if (problem) return { errors: { countedUnits: [ADJUSTMENT_MESSAGE[problem]] } };

  await recordMovement({
    productId,
    delta,
    reason: "ADJUSTMENT",
    note: note ?? `Recuento: ${countedUnits} unidades`,
    actorUserId: admin.userId,
    // El admin ajusta el almacén **del proveedor**, y el libro lo dice.
    onBehalfOfSupplierId: product.supplierId,
  });

  revalidateProduct(productId);
  return { success: true };
}

const lossSchema = z.object({
  productId: idSchema,
  units: quantitySchema(1),
  note: optionalText,
});

/**
 * Una merma: rotura, robo o lo que sea que se fue sin venderse.
 *
 * Existe aparte del recuento porque el motivo importa. Los dos bajan el saldo,
 * pero `ADJUSTMENT` dice "el libro estaba mal" y `LOSS` dice "el libro estaba
 * bien y la mercancía se perdió", y esa distinción es la que hace útil el
 * histórico.
 */
export async function recordLoss(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const admin = await verifyAdmin();

  const parsed = lossSchema.safeParse({
    productId: formData.get("productId"),
    units: formData.get("units"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { productId, units, note } = parsed.data;

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { stock: true, supplierId: true },
  });
  if (!product) return { message: "El producto ya no existe." };

  const problem = checkAdjustment(product.stock, -units);
  if (problem) return { errors: { units: [ADJUSTMENT_MESSAGE[problem]] } };

  await recordMovement({
    productId,
    delta: -units,
    reason: "LOSS",
    note: note ?? null,
    actorUserId: admin.userId,
    onBehalfOfSupplierId: product.supplierId,
  });

  revalidateProduct(productId);
  return { success: true };
}

const announceSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema(1),
  etaFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }),
  etaTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Fecha inválida." }),
  note: optionalText,
});

/** Anunciar una reposición. No toca el saldo: es una intención, no un hecho. */
export async function createRestock(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const admin = await verifyAdmin();

  const parsed = announceSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    etaFrom: formData.get("etaFrom"),
    etaTo: formData.get("etaTo"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { productId, quantity, etaFrom, etaTo, note } = parsed.data;
  if (quantity > MAX_MOVEMENT) {
    return { errors: { quantity: ["La cantidad es demasiado alta."] } };
  }

  const problem = checkRestockWindow({ etaFrom, etaTo }, isoDay(new Date()));
  if (problem) return { errors: { etaTo: [RESTOCK_MESSAGE[problem]] } };

  const exists = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true },
  });
  if (!exists) return { message: "El producto ya no existe." };

  await announceRestock({
    productId,
    quantity,
    etaFrom,
    etaTo,
    note,
    createdBy: admin.userId,
  });

  revalidateProduct(productId);
  return { success: true };
}

const resolveSchema = z.object({
  productId: idSchema,
  restockId: idSchema,
  arrivedUnits: quantitySchema(0),
});

/**
 * La reposición llegó: se cierra el anuncio y entra el stock de verdad.
 *
 * Lo que llega puede no ser lo anunciado, y por eso se pregunta en vez de darlo
 * por bueno — la distancia entre las dos cifras es lo que dice quién cumple.
 */
export async function markRestockArrived(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const admin = await verifyAdmin();

  const parsed = resolveSchema.safeParse({
    productId: formData.get("productId"),
    restockId: formData.get("restockId"),
    arrivedUnits: formData.get("arrivedUnits"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { productId, restockId, arrivedUnits } = parsed.data;

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { supplierId: true },
  });
  if (!product) return { message: "El producto ya no existe." };

  const result = await resolveRestock({
    restockId,
    arrivedUnits,
    actorUserId: admin.userId,
    onBehalfOfSupplierId: product.supplierId,
  });
  if (!result.ok) {
    return {
      message:
        result.reason === "not-found"
          ? "Esa reposición ya no existe."
          : "Esa reposición ya estaba resuelta.",
    };
  }

  revalidateProduct(productId);
  return { success: true };
}

/** El proveedor la retira antes de que llegue. */
export async function dismissRestock(
  _state: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  // Cancelar no deja rastro en el libro —no toca el saldo—, así que aquí el
  // actor no se guarda: basta con la guarda.
  await verifyAdmin();

  const productId = idSchema.safeParse(formData.get("productId"));
  const restockId = idSchema.safeParse(formData.get("restockId"));
  if (!productId.success || !restockId.success) {
    return { message: "Reposición inválida." };
  }

  const result = await cancelRestock(restockId.data);
  if (!result.ok) {
    return {
      message:
        result.reason === "not-found"
          ? "Esa reposición ya no existe."
          : "Esa reposición ya estaba resuelta.",
    };
  }

  revalidateProduct(productId.data);
  return { success: true };
}
