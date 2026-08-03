/**
 * Los valores de los enums de un servicio, en un módulo puro.
 *
 * Vive fuera de la Server Action por una regla de Next: un fichero
 * `"use server"` solo puede exportar funciones async, así que una constante
 * compartida no cabe ahí. Y fuera de `schema.ts` porque lo importa un componente
 * de cliente, que no debe arrastrar drizzle al bundle — el mismo trato que ya
 * tiene `ServicePricing` en `lib/catalog/queries.ts`.
 *
 * Espejan `service_pricing` y `equipment_scope` del schema; si allí se añade un
 * valor, se añade aquí.
 */

/** Cómo se calcula el precio de un servicio. */
export const SERVICE_PRICINGS = ["FLAT", "PER_UNIT"] as const;
export type ServicePricing = (typeof SERVICE_PRICINGS)[number];

/** Sobre qué equipo trabaja, de más estrecho a más ancho. */
export const EQUIPMENT_SCOPES = ["OWN", "PLATFORM", "ANY"] as const;
export type EquipmentScope = (typeof EQUIPMENT_SCOPES)[number];
