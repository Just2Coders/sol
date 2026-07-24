"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { orders, supplierZones, suppliers, zones } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import { slugify } from "@/lib/utils";

export type SupplierFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
    }
  | undefined;

const optionalText = z
  .string()
  .trim()
  .transform((s) => s || undefined)
  .optional();

const supplierSchema = z.object({
  name: z.string().trim().min(2, { error: "El nombre es muy corto." }),
  email: z.email({ error: "Correo inválido." }).trim().toLowerCase().optional(),
  phone: optionalText,
  logoUrl: z.url({ error: "Debe ser una URL válida (https://...)." }).trim().optional(),
  notes: optionalText,
  payoutInfo: optionalText,
  active: z.boolean(),
  zoneIds: z.array(z.uuid()),
});

const idSchema = z.uuid();

function parseSupplierForm(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone"),
    logoUrl: formData.get("logoUrl") || undefined,
    notes: formData.get("notes"),
    payoutInfo: formData.get("payoutInfo"),
    active: formData.get("active") === "on",
    zoneIds: formData.getAll("zoneIds"),
  });
}

function revalidateSuppliers() {
  revalidatePath("/admin/proveedores");
}

// Ignora zonas que ya no existan (p. ej. eliminadas con el formulario abierto)
// para no romper la FK de supplier_zones.
async function existingZoneIds(zoneIds: string[]): Promise<string[]> {
  if (zoneIds.length === 0) return [];
  const rows = await db
    .select({ id: zones.id })
    .from(zones)
    .where(inArray(zones.id, zoneIds));
  return rows.map((r) => r.id);
}

export async function createSupplier(
  _state: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  await verifyAdmin();

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { zoneIds, ...data } = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const taken = await db.query.suppliers.findFirst({ where: eq(suppliers.slug, slug) });
  if (taken) {
    return { errors: { name: ["Ya existe un proveedor con ese nombre."] } };
  }

  const [supplier] = await db
    .insert(suppliers)
    .values({ ...data, slug })
    .returning({ id: suppliers.id });
  if (!supplier) return { message: "No se pudo crear el proveedor." };

  const validZoneIds = await existingZoneIds(zoneIds);
  if (validZoneIds.length > 0) {
    await db
      .insert(supplierZones)
      .values(validZoneIds.map((zoneId) => ({ supplierId: supplier.id, zoneId })));
  }

  revalidateSuppliers();
  redirect("/admin/proveedores");
}

export async function updateSupplier(
  _state: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Proveedor inválido." };

  const parsed = parseSupplierForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { zoneIds, ...data } = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const taken = await db.query.suppliers.findFirst({
    where: and(eq(suppliers.slug, slug), ne(suppliers.id, id.data)),
  });
  if (taken) {
    return { errors: { name: ["Ya existe un proveedor con ese nombre."] } };
  }

  const [updated] = await db
    .update(suppliers)
    .set({ ...data, slug })
    .where(eq(suppliers.id, id.data))
    .returning({ id: suppliers.id });
  if (!updated) return { message: "El proveedor ya no existe." };

  // Reemplaza la cobertura completa: borrar + insertar en un batch atómico.
  const validZoneIds = await existingZoneIds(zoneIds);
  const clearCoverage = db
    .delete(supplierZones)
    .where(eq(supplierZones.supplierId, id.data));
  if (validZoneIds.length > 0) {
    await db.batch([
      clearCoverage,
      db
        .insert(supplierZones)
        .values(validZoneIds.map((zoneId) => ({ supplierId: id.data, zoneId }))),
    ]);
  } else {
    await clearCoverage;
  }

  revalidateSuppliers();
  return { success: true };
}

export async function deleteSupplier(
  _state: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Proveedor inválido." };

  // Las órdenes referencian al proveedor sin cascade: si existen, no se borra
  // (se pierde la trazabilidad de la liquidación). Desactívalo en su lugar.
  const order = await db.query.orders.findFirst({
    where: eq(orders.supplierId, id.data),
  });
  if (order) {
    return {
      message: "Tiene órdenes asociadas; desactívalo en lugar de eliminarlo.",
    };
  }

  // Borra en cascada su cobertura, productos y kits.
  await db.delete(suppliers).where(eq(suppliers.id, id.data));

  revalidateSuppliers();
  redirect("/admin/proveedores");
}
