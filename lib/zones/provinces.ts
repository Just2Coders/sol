/**
 * Las 16 provincias de Cuba, en el mismo orden oeste→este del mapa.
 *
 * PROTOTIPO — cuando las zonas reales de Cuba estén sembradas en `zones`,
 * esto se reemplaza por una consulta (ver `lib/zones/coverage.ts`, que tiene
 * la misma nota). Vive en su propio módulo, aparte del prototipo de
 * `components/landing/supplier-cta/prototype-kit.tsx`, porque además de
 * alimentar el `<Select>` del cliente, la Server Action de `/sell`
 * (`app/actions/supplier-leads.ts`) la usa para validar la provincia
 * recibida — y esa Action no puede importar de un módulo `"use client"`.
 */
export const PROVINCES = [
  "Pinar del Río",
  "Artemisa",
  "La Habana",
  "Mayabeque",
  "Matanzas",
  "Cienfuegos",
  "Villa Clara",
  "Sancti Spíritus",
  "Ciego de Ávila",
  "Camagüey",
  "Las Tunas",
  "Holguín",
  "Granma",
  "Santiago de Cuba",
  "Guantánamo",
  "Isla de la Juventud",
] as const;
