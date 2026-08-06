/**
 * Los valores de los enums de un servicio, en un módulo puro.
 *
 * Vive fuera de la Server Action por una regla de Next: un fichero
 * `"use server"` solo puede exportar funciones async, así que una constante
 * compartida no cabe ahí. Y fuera de `schema.ts` porque lo importa un componente
 * de cliente, que no debe arrastrar drizzle al bundle — el mismo trato que ya
 * tiene `ServicePricing` en `lib/catalog/queries.ts`.
 *
 * Espejan `service_pricing`, `equipment_scope` e `installable_type` del schema;
 * si allí se añade un valor, se añade aquí.
 */

/** Cómo se calcula el precio de un servicio. */
export const SERVICE_PRICINGS = ["FLAT", "PER_UNIT"] as const;
export type ServicePricing = (typeof SERVICE_PRICINGS)[number];

/** Sobre qué equipo trabaja, de más estrecho a más ancho. */
export const EQUIPMENT_SCOPES = ["OWN", "PLATFORM", "ANY"] as const;
export type EquipmentScope = (typeof EQUIPMENT_SCOPES)[number];

/** Lo que se puede instalar: un producto suelto o un kit. Nunca otro servicio. */
export const INSTALLABLE_TYPES = ["PRODUCT", "KIT"] as const;
export type InstallableType = (typeof INSTALLABLE_TYPES)[number];

/**
 * Cómo viaja una oferta en el formulario: `"KIT:<uuid>"`.
 *
 * Una casilla solo lleva un `value`, y la oferta son dos datos —de qué tabla y
 * cuál—, así que van pegados. Se arman y se parten aquí, en el único sitio que
 * conocen los dos lados.
 */
export const OFFER_SEPARATOR = ":";

export function offerToken(type: InstallableType, id: string): string {
  return `${type}${OFFER_SEPARATOR}${id}`;
}
