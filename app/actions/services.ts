"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { serviceCategories, services, suppliers } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import { openPriceTimeline, recordPriceChange } from "@/lib/pricing/service";
import { deleteBlobs, removedImages } from "@/lib/blob";
import { EQUIPMENT_SCOPES, SERVICE_PRICINGS } from "@/lib/services/enums";
import { hasForeignOffers } from "@/lib/services/queries";
import {
  idSchema,
  imageUrlsSchema,
  optionalText,
  parseValues,
  priceUsdSchema,
  type ActionState,
} from "@/lib/forms";
import { slugify } from "@/lib/utils";

export type ServiceFormState = ActionState;

/**
 * Un servicio del catálogo.
 *
 * Dos reglas propias que no tiene ningún otro item:
 *
 * - **La unidad de obra depende de cómo se cobra.** En `PER_UNIT` el precio se
 *   multiplica por algo ("25 USD por panel") y sin nombrar ese algo la ficha no
 *   se puede escribir; en `FLAT` no hay nada que multiplicar, así que se guarda
 *   `null` en vez de dejar un rótulo huérfano que luego alguien pintaría.
 * - **El alcance dice sobre qué equipo trabaja** (ver PLAN.md). Se valida como
 *   enum cerrado: es lo que decide si el servicio puede ofrecerse junto al
 *   equipo de otro proveedor.
 */
const serviceSchema = z
  .object({
    supplierId: idSchema,
    categoryId: idSchema,
    name: z.string().trim().min(2, { error: "El nombre es muy corto." }),
    description: optionalText,
    pricing: z.enum(SERVICE_PRICINGS, { error: "Elige cómo se cobra." }),
    priceUsd: priceUsdSchema,
    unitLabel: optionalText,
    equipmentScope: z.enum(EQUIPMENT_SCOPES, { error: "Elige el alcance." }),
    images: imageUrlsSchema,
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.pricing === "PER_UNIT" && !data.unitLabel) {
      ctx.addIssue({
        code: "custom",
        path: ["unitLabel"],
        message: 'Con precio por unidad hace falta nombrarla (ej. "panel").',
      });
    }
  })
  // En `FLAT` la unidad sobra: se descarta aquí y no en la UI, que es dato del
  // cliente y no manda.
  .transform((data) => ({
    ...data,
    unitLabel: data.pricing === "PER_UNIT" ? data.unitLabel : undefined,
  }));

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description"),
    pricing: formData.get("pricing"),
    priceUsd: formData.get("priceUsd"),
    unitLabel: formData.get("unitLabel"),
    equipmentScope: formData.get("equipmentScope"),
    images: parseValues(formData.getAll("images")),
    active: formData.get("active") === "on",
  });
}

// Un servicio se ve en su listado del admin y en la ficha de cada equipo que lo
// ofrece, más su propia ficha pública.
function revalidateServices() {
  revalidatePath("/admin/services");
  revalidatePath("/catalog/services/[slug]", "page");
  revalidatePath("/catalog/products/[slug]", "page");
  revalidatePath("/catalog/kits/[slug]", "page");
}

/** Proveedor y categoría tienen que existir; los ids vienen del cliente. */
async function checkRefs(
  supplierId: string,
  categoryId: string,
): Promise<ServiceFormState | null> {
  const [supplier, category] = await Promise.all([
    db.query.suppliers.findFirst({ where: eq(suppliers.id, supplierId) }),
    db.query.serviceCategories.findFirst({
      where: eq(serviceCategories.id, categoryId),
    }),
  ]);
  if (!supplier) return { errors: { supplierId: ["El proveedor no existe."] } };
  if (!category) return { errors: { categoryId: ["La categoría no existe."] } };
  return null;
}

export async function createService(
  _state: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const admin = await verifyAdmin();

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const badRef = await checkRefs(data.supplierId, data.categoryId);
  if (badRef) return badRef;

  const taken = await db.query.services.findFirst({
    where: eq(services.slug, slug),
  });
  if (taken) {
    return { errors: { name: ["Ya existe un servicio con ese nombre."] } };
  }

  const [created] = await db
    .insert(services)
    .values({ ...data, slug })
    .returning({ id: services.id });

  // El precio nace con su linea de tiempo, no solo con la columna.
  await openPriceTimeline("SERVICE", created.id, data.priceUsd, admin.userId);

  revalidateServices();
  redirect("/admin/services");
}

export async function updateService(
  _state: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const admin = await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Servicio inválido." };

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;
  const slug = slugify(data.name);
  if (!slug) {
    return { errors: { name: ["El nombre debe incluir letras o números."] } };
  }

  const badRef = await checkRefs(data.supplierId, data.categoryId);
  if (badRef) return badRef;

  const taken = await db.query.services.findFirst({
    where: and(eq(services.slug, slug), ne(services.id, id.data)),
  });
  if (taken) {
    return { errors: { name: ["Ya existe un servicio con ese nombre."] } };
  }

  const current = await db.query.services.findFirst({
    where: eq(services.id, id.data),
  });
  if (!current) return { message: "El servicio ya no existe." };

  // Cerrar el alcance a `OWN` —o mudar el servicio a otro proveedor— dejaría en
  // el catálogo ofertas sobre equipo ajeno que ya no se podrían cumplir. Se
  // comprueba contra el proveedor que va a quedar, no contra el de antes.
  const closing = data.equipmentScope === "OWN" && current.equipmentScope !== "OWN";
  const moving = data.supplierId !== current.supplierId;
  if (closing || moving) {
    if (await hasForeignOffers(id.data, data.supplierId)) {
      const field = closing ? "equipmentScope" : "supplierId";
      return {
        errors: {
          [field]: [
            "Está ofrecido sobre equipo de otro proveedor; quita esas ofertas primero.",
          ],
        },
      };
    }
  }

  await db.update(services).set({ ...data, slug }).where(eq(services.id, id.data));

  // La columna es la cache; la fila es la verdad. Solo escribe si cambio.
  await recordPriceChange("SERVICE", id.data, data.priceUsd, admin.userId);

  // Las imágenes que el admin quitó del formulario ya no las referencia nadie.
  await deleteBlobs(removedImages(current.images, data.images));

  revalidateServices();
  return { success: true };
}

export async function deleteService(
  _state: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await verifyAdmin();

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: "Servicio inválido." };

  const service = await db.query.services.findFirst({
    where: eq(services.id, id.data),
  });

  // Sin guarda por `installation_offers`, al revés que un producto dentro de un
  // kit: ahí el borrado vaciaría en silencio algo de otro: aquí las ofertas son
  // de este mismo servicio y sin él no significan nada, así que la cascada es
  // justo lo que se quiere. Las órdenes tampoco atan: `order_items` guarda
  // snapshot de nombre y precio, y el historial queda intacto.
  await db.delete(services).where(eq(services.id, id.data));
  await deleteBlobs(service?.images ?? []);

  revalidateServices();
  redirect("/admin/services");
}
