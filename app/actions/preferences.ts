"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { setZonePreference } from "@/lib/zones/preference";

/**
 * Preferencias del visitante (sin cuenta): hoy solo la zona donde instala.
 *
 * La eligen el selector de la home y el filtro del catálogo; ambos ya escriben
 * la zona en la URL, esta Action es lo que hace que la elección sobreviva a la
 * siguiente visita. No revalida nada: la página que la llama ya navega a la
 * URL con el filtro aplicado.
 */
const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

export async function selectZone(slug: string | null): Promise<void> {
  if (slug === null) {
    await setZonePreference(null);
    return;
  }

  const parsed = slugSchema.safeParse(slug);
  // Un slug inventado no se guarda: la próxima visita vería un catálogo vacío.
  if (!parsed.success) return;

  await setZonePreference(parsed.data);
}

/**
 * "Ver toda la isla" desde el catálogo vacío de una zona sin proveedores.
 *
 * Tiene que borrar la cookie además de navegar: un simple enlace a `/catalog`
 * volvería a caer en la zona guardada y el visitante no saldría nunca de su
 * provincia vacía.
 */
export async function browseWholeCountry(): Promise<void> {
  await setZonePreference(null);
  redirect("/catalog");
}
