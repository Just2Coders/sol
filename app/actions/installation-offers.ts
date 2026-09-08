"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, or } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { installationOffers, kits, products, services } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/dal";
import {
  INSTALLABLE_TYPES,
  OFFER_SEPARATOR,
  type InstallableType,
} from "@/lib/services/enums";
import { idSchema, parseValues, type ActionState } from "@/lib/forms";

export type OffersFormState = ActionState;

/**
 * Qué equipos lleva pegada la instalación de un servicio.
 *
 * Se edita **aparte** del formulario del servicio, y no dentro como las zonas de
 * un proveedor, por la regla que ya vive en `updateService`: cerrar un servicio a
 * `OWN` teniendo ofertas sobre equipo ajeno se rechaza con un «quita esas ofertas
 * primero». Si las casillas vivieran en el mismo formulario, el select de alcance
 * las escondería justo cuando hay que quitarlas — un bloqueo sin salida. Con una
 * sección propia, ese mensaje por fin tiene dónde cumplirse.
 */

/** `"KIT:<uuid>"` → `{ targetType, targetId }`. El formato lo arma `offerToken`. */
const targetSchema = z
  .string()
  .trim()
  .transform((raw) => {
    const separator = raw.indexOf(OFFER_SEPARATOR);
    return {
      targetType: separator === -1 ? "" : raw.slice(0, separator),
      targetId: separator === -1 ? "" : raw.slice(separator + 1),
    };
  })
  .pipe(
    z.object({
      targetType: z.enum(INSTALLABLE_TYPES),
      targetId: z.uuid(),
    }),
  );

const offersSchema = z.object({
  serviceId: idSchema,
  targets: z.array(targetSchema).max(200, {
    error: "Demasiados equipos seleccionados.",
  }),
});

type Target = { targetType: InstallableType; targetId: string };

/**
 * ¿Existen todos, y de quién son?
 *
 * Dos consultas y no una por fila: `targetId` es una FK blanda que apunta a dos
 * tablas según `targetType`, así que hay que preguntar en las dos —pero cada una
 * de un tirón, que con Neon por HTTP cada consulta es una latencia.
 */
async function resolveOwners(
  targets: Target[],
): Promise<Map<string, string> | null> {
  const productIds = targets.filter((t) => t.targetType === "PRODUCT").map((t) => t.targetId);
  const kitIds = targets.filter((t) => t.targetType === "KIT").map((t) => t.targetId);

  const [productRows, kitRows] = await Promise.all([
    productIds.length
      ? db
          .select({ id: products.id, supplierId: products.supplierId })
          .from(products)
          .where(inArray(products.id, productIds))
      : [],
    kitIds.length
      ? db
          .select({ id: kits.id, supplierId: kits.supplierId })
          .from(kits)
          .where(inArray(kits.id, kitIds))
      : [],
  ]);

  const owners = new Map<string, string>();
  for (const row of productRows) owners.set(`PRODUCT${OFFER_SEPARATOR}${row.id}`, row.supplierId);
  for (const row of kitRows) owners.set(`KIT${OFFER_SEPARATOR}${row.id}`, row.supplierId);

  // Uno que no aparece es un id inventado, o un item borrado entre que se pintó
  // el formulario y se envió. En los dos casos no se guarda nada.
  const complete = targets.every((t) =>
    owners.has(`${t.targetType}${OFFER_SEPARATOR}${t.targetId}`),
  );
  return complete ? owners : null;
}

export async function setInstallationOffers(
  _state: OffersFormState,
  formData: FormData,
): Promise<OffersFormState> {
  await verifyAdmin();

  const parsed = offersSchema.safeParse({
    serviceId: formData.get("serviceId"),
    targets: parseValues(formData.getAll("targets")),
  });
  if (!parsed.success) {
    return { message: "Selección inválida. Recarga la página e inténtalo de nuevo." };
  }

  const { serviceId, targets } = parsed.data;

  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
    columns: { id: true, supplierId: true, equipmentScope: true },
  });
  if (!service) return { message: "El servicio ya no existe." };

  const owners = targets.length > 0 ? await resolveOwners(targets) : new Map<string, string>();
  if (!owners) {
    return { message: "Alguno de los equipos ya no existe. Recarga la página." };
  }

  // La regla del alcance, del lado de escritura: `OWN` solo se pega a lo que
  // vende su propio proveedor; `PLATFORM` y `ANY` aceptan equipo ajeno y aquí
  // valen lo mismo (lo que los separa es venderse a ciegas, que es cosa de la
  // ficha). Es la misma condición que `getInstallationsFor` aplica al leer.
  if (service.equipmentScope === "OWN") {
    const foreign = targets.filter(
      (t) => owners.get(`${t.targetType}${OFFER_SEPARATOR}${t.targetId}`) !== service.supplierId,
    );
    if (foreign.length > 0) {
      return {
        message:
          "Este servicio solo trabaja sobre equipo propio: quita lo que sea de otro proveedor, o ábrele el alcance arriba.",
      };
    }
  }

  // Se reemplaza el conjunto entero. Sin transacción: `neon-http` no las
  // soporta —lo lanza explícitamente— y aquí el riesgo es que el proceso muera
  // entre el borrado y la inserción, con un admin volviendo a guardar. La que sí
  // necesita transacción de verdad es la creación del pedido (PLAN.md, Etapa 6),
  // y esa es la que obliga a cambiar de driver.
  const current = await db
    .select({ targetType: installationOffers.targetType, targetId: installationOffers.targetId })
    .from(installationOffers)
    .where(eq(installationOffers.serviceId, serviceId));

  const wanted = new Set(
    targets.map((t) => `${t.targetType}${OFFER_SEPARATOR}${t.targetId}`),
  );
  const stale = current.filter(
    (o) => !wanted.has(`${o.targetType}${OFFER_SEPARATOR}${o.targetId}`),
  );
  const existing = new Set(
    current.map((o) => `${o.targetType}${OFFER_SEPARATOR}${o.targetId}`),
  );
  const added = targets.filter(
    (t) => !existing.has(`${t.targetType}${OFFER_SEPARATOR}${t.targetId}`),
  );

  // Solo la diferencia: sin transacción, tocar lo que no cambió sería agrandar
  // la ventana en la que el conjunto está a medias sin ninguna ganancia.
  if (stale.length > 0) {
    await db.delete(installationOffers).where(
      and(
        eq(installationOffers.serviceId, serviceId),
        or(
          ...stale.map((o) =>
            and(
              eq(installationOffers.targetType, o.targetType),
              eq(installationOffers.targetId, o.targetId),
            ),
          ),
        ),
      ),
    );
  }

  if (added.length > 0) {
    await db
      .insert(installationOffers)
      .values(added.map((t) => ({ serviceId, ...t })));
  }

  // Una oferta decide qué instalación aparece en la ficha de un equipo, así que
  // cambia las dos fichas y el listado del admin.
  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/catalog/products/[slug]", "page");
  revalidatePath("/catalog/kits/[slug]", "page");

  return { success: true };
}
