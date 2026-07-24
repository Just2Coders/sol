"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { orders, supplierZones, users, zones } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import { slugify } from "@/lib/utils";

export type ZoneFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
    }
  | undefined;

const zoneSchema = z.object({
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }),
  parentId: z.uuid().optional(),
});

const idSchema = z.uuid();

// Rutas que muestran zonas: el admin y el selector de zona del registro.
function revalidateZones() {
  revalidatePath("/admin/zonas");
  revalidatePath("/registro");
}

export async function createZone(
  _state: ZoneFormState,
  formData: FormData,
): Promise<ZoneFormState> {
  await verifyAdmin();

  const parsed = zoneSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || undefined,
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, parentId } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  if (parentId) {
    const parent = await db.query.zones.findFirst({ where: eq(zones.id, parentId) });
    if (!parent) return { message: "El estado seleccionado no existe." };
    if (parent.parentId) {
      return { message: "Solo hay dos niveles: estado → ciudad." };
    }
  }

  const existing = await db.query.zones.findFirst({ where: eq(zones.slug, slug) });
  if (existing) {
    return { errors: { name: ["Ya existe una zona con ese nombre."] } };
  }

  await db.insert(zones).values({ name, slug, parentId });
  revalidateZones();
  return { success: true };
}

export async function updateZone(
  _state: ZoneFormState,
  formData: FormData,
): Promise<ZoneFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  const parsed = zoneSchema.pick({ name: true }).safeParse({ name: formData.get("name") });

  if (!id.success) return { message: "Zona inválida." };
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const slug = slugify(parsed.data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const taken = await db.query.zones.findFirst({
    where: and(eq(zones.slug, slug), ne(zones.id, id.data)),
  });
  if (taken) {
    return { errors: { name: ["Ya existe una zona con ese nombre."] } };
  }

  const [updated] = await db
    .update(zones)
    .set({ name: parsed.data.name, slug })
    .where(eq(zones.id, id.data))
    .returning({ id: zones.id });
  if (!updated) return { message: "La zona ya no existe." };

  revalidateZones();
  return { success: true };
}

export async function deleteZone(
  _state: ZoneFormState,
  formData: FormData,
): Promise<ZoneFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Zona inválida." };

  // Guardas: no se borra una zona con ciudades, usuarios, cobertura de
  // proveedores u órdenes ligadas (todas la referencian sin cascade).
  const [child, user, coverage, order] = await Promise.all([
    db.query.zones.findFirst({ where: eq(zones.parentId, id.data) }),
    db.query.users.findFirst({ where: eq(users.zoneId, id.data) }),
    db.query.supplierZones.findFirst({ where: eq(supplierZones.zoneId, id.data) }),
    db.query.orders.findFirst({ where: eq(orders.zoneId, id.data) }),
  ]);

  if (child) return { message: "Elimina primero las ciudades de este estado." };
  if (user) return { message: "Hay usuarios registrados en esta zona." };
  if (coverage) return { message: "Hay proveedores que cubren esta zona." };
  if (order) return { message: "Hay órdenes asociadas a esta zona." };

  await db.delete(zones).where(eq(zones.id, id.data));
  revalidateZones();
  return { success: true };
}
