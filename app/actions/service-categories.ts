"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { serviceCategories } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import { categoryHasServices } from "@/lib/service-categories/queries";
import { idSchema, optionalText, quantitySchema, type ActionState } from "@/lib/forms";
import { slugify } from "@/lib/utils";

export type ServiceCategoryFormState = ActionState;

/**
 * Las categorías son una tabla y no un enum a propósito (ver PLAN.md): añadir
 * "mantenimiento" no debería requerir un deploy. Esto es lo que hace que esa
 * decisión sirva de algo.
 *
 * `position` es el orden en que el admin quiere verlas listadas, y no es solo
 * cosa del panel: es la primera clave del `ORDER BY` con el que el catálogo
 * público pinta las instalaciones de una ficha.
 */
const categorySchema = z.object({
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }),
  description: optionalText,
  position: quantitySchema(0),
});

function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    // El formulario de creación no pide posición: se añade al final del orden.
    position: formData.get("position") ?? "0",
  });
}

// El orden y los nombres se ven en el admin y en la ficha de cada equipo que
// ofrece instalación, así que las dos ramas del catálogo se revalidan.
function revalidateCategories() {
  revalidatePath("/admin/service-categories");
  revalidatePath("/admin/services");
  revalidatePath("/catalog/products/[slug]", "page");
  revalidatePath("/catalog/kits/[slug]", "page");
}

export async function createServiceCategory(
  _state: ServiceCategoryFormState,
  formData: FormData,
): Promise<ServiceCategoryFormState> {
  await verifyAdmin();

  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, description, position } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const taken = await db.query.serviceCategories.findFirst({
    where: eq(serviceCategories.slug, slug),
  });
  if (taken) {
    return { errors: { name: ["Ya existe una categoría con ese nombre."] } };
  }

  await db.insert(serviceCategories).values({ name, slug, description, position });

  revalidateCategories();
  return { success: true };
}

export async function updateServiceCategory(
  _state: ServiceCategoryFormState,
  formData: FormData,
): Promise<ServiceCategoryFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Categoría inválida." };

  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, description, position } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const taken = await db.query.serviceCategories.findFirst({
    where: and(eq(serviceCategories.slug, slug), ne(serviceCategories.id, id.data)),
  });
  if (taken) {
    return { errors: { name: ["Ya existe una categoría con ese nombre."] } };
  }

  const [updated] = await db
    .update(serviceCategories)
    .set({ name, slug, description, position })
    .where(eq(serviceCategories.id, id.data))
    .returning({ id: serviceCategories.id });
  if (!updated) return { message: "La categoría ya no existe." };

  revalidateCategories();
  return { success: true };
}

export async function deleteServiceCategory(
  _state: ServiceCategoryFormState,
  formData: FormData,
): Promise<ServiceCategoryFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Categoría inválida." };

  // `services.categoryId` no lleva cascade a propósito (ver schema): una
  // categoría en uso no se borra sin recolocar antes sus servicios. Postgres lo
  // impediría igual, pero un error de FK crudo no le dice nada al admin.
  if (await categoryHasServices(id.data)) {
    return {
      message: "Hay servicios en esta categoría; muévelos a otra antes de eliminarla.",
    };
  }

  await db.delete(serviceCategories).where(eq(serviceCategories.id, id.data));

  revalidateCategories();
  return { success: true };
}
