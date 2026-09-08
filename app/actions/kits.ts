"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { kitItems, kits, products, suppliers } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import { openPriceTimeline, recordPriceChange } from "@/lib/pricing/service";
import { deleteBlobs, removedImages } from "@/lib/blob";
import {
  idSchema,
  imageUrlsSchema,
  optionalText,
  parseValues,
  priceUsdSchema,
  quantitySchema,
  type ActionState,
} from "@/lib/forms";
import { slugify } from "@/lib/utils";

export type KitFormState = ActionState;

const kitSchema = z.object({
  supplierId: idSchema,
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }),
  description: optionalText,
  priceUsd: priceUsdSchema,
  images: imageUrlsSchema,
  active: z.boolean(),
  items: z
    .array(z.object({ productId: idSchema, quantity: quantitySchema(1) }))
    .min(1, { error: "Un kit debe incluir al menos un producto." }),
});

/**
 * Los productos llegan como checkboxes `productIds` + un input `qty-<id>` por
 * cada uno; se recomponen aquí en pares {productId, quantity}.
 */
function parseKitForm(formData: FormData) {
  const productIds = [
    ...new Set(
      formData.getAll("productIds").filter((v): v is string => typeof v === "string"),
    ),
  ];

  return kitSchema.safeParse({
    supplierId: formData.get("supplierId"),
    name: formData.get("name"),
    description: formData.get("description"),
    priceUsd: formData.get("priceUsd"),
    images: parseValues(formData.getAll("images")),
    active: formData.get("active") === "on",
    items: productIds.map((productId) => ({
      productId,
      quantity: formData.get(`qty-${productId}`) ?? "1",
    })),
  });
}

function revalidateKits() {
  revalidatePath("/admin/kits");
}

/**
 * Regla de negocio (PLAN §Etapa 4): un kit solo puede contener productos de su
 * mismo proveedor. Se comprueba contra la BD, nunca confiando en el cliente.
 */
async function assertItemsBelongToSupplier(
  items: { productId: string }[],
  supplierId: string,
): Promise<string | null> {
  const ids = items.map((item) => item.productId);
  const rows = await db
    .select({ id: products.id, supplierId: products.supplierId })
    .from(products)
    .where(inArray(products.id, ids));

  if (rows.length !== ids.length) {
    return "Alguno de los productos seleccionados ya no existe.";
  }
  if (rows.some((row) => row.supplierId !== supplierId)) {
    return "Todos los productos del kit deben ser del mismo proveedor.";
  }
  return null;
}

export async function createKit(
  _state: KitFormState,
  formData: FormData,
): Promise<KitFormState> {
  const admin = await verifyAdmin();

  const parsed = parseKitForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { items, ...data } = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, data.supplierId),
  });
  if (!supplier) return { errors: { supplierId: ["El proveedor no existe."] } };

  const taken = await db.query.kits.findFirst({ where: eq(kits.slug, slug) });
  if (taken) return { errors: { name: ["Ya existe un kit con ese nombre."] } };

  const itemsError = await assertItemsBelongToSupplier(items, data.supplierId);
  if (itemsError) return { message: itemsError };

  const [kit] = await db
    .insert(kits)
    .values({ ...data, slug })
    .returning({ id: kits.id });
  if (!kit) return { message: "No se pudo crear el kit." };

  await db
    .insert(kitItems)
    .values(items.map((item) => ({ ...item, kitId: kit.id })));

  // El precio nace con su linea de tiempo, no solo con la columna.
  await openPriceTimeline("KIT", kit.id, data.priceUsd, admin.userId);

  revalidateKits();
  redirect("/admin/kits");
}

export async function updateKit(
  _state: KitFormState,
  formData: FormData,
): Promise<KitFormState> {
  const admin = await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Kit inválido." };

  const parsed = parseKitForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { items, ...data } = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, data.supplierId),
  });
  if (!supplier) return { errors: { supplierId: ["El proveedor no existe."] } };

  const taken = await db.query.kits.findFirst({
    where: and(eq(kits.slug, slug), ne(kits.id, id.data)),
  });
  if (taken) return { errors: { name: ["Ya existe un kit con ese nombre."] } };

  const itemsError = await assertItemsBelongToSupplier(items, data.supplierId);
  if (itemsError) return { message: itemsError };

  const current = await db.query.kits.findFirst({ where: eq(kits.id, id.data) });
  if (!current) return { message: "El kit ya no existe." };

  const [updated] = await db
    .update(kits)
    .set({ ...data, slug })
    .where(eq(kits.id, id.data))
    .returning({ id: kits.id });
  if (!updated) return { message: "El kit ya no existe." };

  await deleteBlobs(removedImages(current.images, data.images));

  // Reemplaza la composición completa. En transacción y no en `batch`: el
  // driver ya las soporta, y un kit a medio recomponer —vaciado y sin volver a
  // llenar— es un kit que se vende sin piezas.
  // La columna es la cache; la fila es la verdad. Solo escribe si cambio.
  await recordPriceChange("KIT", id.data, data.priceUsd, admin.userId);

  await db.transaction(async (tx) => {
    await tx.delete(kitItems).where(eq(kitItems.kitId, id.data));
    await tx
      .insert(kitItems)
      .values(items.map((item) => ({ ...item, kitId: id.data })));
  });

  revalidateKits();
  return { success: true };
}

export async function deleteKit(
  _state: KitFormState,
  formData: FormData,
): Promise<KitFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Kit inválido." };

  const kit = await db.query.kits.findFirst({ where: eq(kits.id, id.data) });

  // `kit_items` cae en cascada. Las órdenes guardan snapshot, no referencia viva.
  await db.delete(kits).where(eq(kits.id, id.data));
  await deleteBlobs(kit?.images ?? []);

  revalidateKits();
  redirect("/admin/kits");
}
