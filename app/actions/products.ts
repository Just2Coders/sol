"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { kitItems, products, suppliers } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import { openLedger } from "@/lib/inventory/service";
import { deleteBlobs, removedImages } from "@/lib/blob";
import {
  idSchema,
  imageUrlsSchema,
  optionalText,
  parseValues,
  priceUsdSchema,
  quantitySchema,
  specsSchema,
  type ActionState,
} from "@/lib/forms";
import { slugify } from "@/lib/utils";

export type ProductFormState = ActionState;

/**
 * Los datos del producto **sin las existencias**.
 *
 * `stock` no está aquí a propósito: es un saldo que solo se mueve por el libro
 * mayor (`lib/inventory/service.ts`), y dejarlo en este formulario significaba
 * que guardar la ficha pisaba la columna y rompía la invariante
 * `stock = sum(movimientos)`. Al crear sí se pregunta —es la apertura del
 * libro—, y para eso está `openingStockSchema` abajo.
 */
const productSchema = z.object({
  supplierId: idSchema,
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }),
  description: optionalText,
  specs: specsSchema,
  priceUsd: priceUsdSchema,
  images: imageUrlsSchema,
  active: z.boolean(),
});

const openingStockSchema = quantitySchema(0);

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    supplierId: formData.get("supplierId"),
    name: formData.get("name"),
    description: formData.get("description"),
    specs: formData.get("specs") ?? "",
    priceUsd: formData.get("priceUsd"),
    images: parseValues(formData.getAll("images")),
    active: formData.get("active") === "on",
  });
}

// El catálogo público (Etapa 5) también leerá productos: se añadirá aquí.
function revalidateProducts() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/kits");
}

export async function createProduct(
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const admin = await verifyAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, data.supplierId),
  });
  if (!supplier) return { errors: { supplierId: ["El proveedor no existe."] } };

  const taken = await db.query.products.findFirst({
    where: eq(products.slug, slug),
  });
  if (taken) {
    return { errors: { name: ["Ya existe un producto con ese nombre."] } };
  }

  const opening = openingStockSchema.safeParse(formData.get("stock"));
  if (!opening.success) {
    return { errors: { stock: z.flattenError(opening.error).formErrors } };
  }

  // El producto nace con el saldo a cero y el libro lo sube: así la invariante
  // se cumple desde la primera fila en vez de tener que arreglarla después.
  const [created] = await db
    .insert(products)
    .values({ ...data, slug })
    .returning({ id: products.id });

  await openLedger(created.id, opening.data, {
    actorUserId: admin.userId,
    onBehalfOfSupplierId: data.supplierId,
  });

  revalidateProducts();
  redirect("/admin/products");
}

export async function updateProduct(
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Producto inválido." };

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, data.supplierId),
  });
  if (!supplier) return { errors: { supplierId: ["El proveedor no existe."] } };

  const taken = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), ne(products.id, id.data)),
  });
  if (taken) {
    return { errors: { name: ["Ya existe un producto con ese nombre."] } };
  }

  // Cambiar de proveedor dejaría el producto dentro de kits de otro proveedor,
  // rompiendo la regla "un kit = un proveedor". Se bloquea mientras esté en uso.
  const inKit = await db.query.kitItems.findFirst({
    where: eq(kitItems.productId, id.data),
  });
  const current = await db.query.products.findFirst({
    where: eq(products.id, id.data),
  });
  if (!current) return { message: "El producto ya no existe." };
  if (inKit && current.supplierId !== data.supplierId) {
    return {
      errors: {
        supplierId: ["Está incluido en kits; quítalo de ellos antes de cambiar de proveedor."],
      },
    };
  }

  await db
    .update(products)
    .set({ ...data, slug, updatedAt: new Date() })
    .where(eq(products.id, id.data));

  // Las imágenes que el admin quitó del formulario ya no las referencia nadie.
  await deleteBlobs(removedImages(current.images, data.images));

  revalidateProducts();
  return { success: true };
}

export async function deleteProduct(
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Producto inválido." };

  // `kit_items` borra en cascada: eliminar aquí vaciaría el kit en silencio.
  const inKit = await db.query.kitItems.findFirst({
    where: eq(kitItems.productId, id.data),
  });
  if (inKit) {
    return {
      message: "Está incluido en uno o más kits; quítalo de ellos o desactívalo.",
    };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, id.data),
  });

  // Las órdenes no lo referencian con FK: `order_items` guarda snapshot de
  // nombre y precio, así que el historial de compras se conserva intacto.
  await db.delete(products).where(eq(products.id, id.data));
  await deleteBlobs(product?.images ?? []);

  revalidateProducts();
  redirect("/admin/products");
}
