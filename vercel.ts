import type { VercelConfig } from "@vercel/config/v1";

/**
 * Configuración del proyecto en Vercel.
 *
 * Existe por el cron: hay tres cosas que tienen que pasar sin que nadie las
 * pida —soltar una reserva vencida, caducar un anuncio pasado de ventana y
 * promover un precio programado— y hasta ahora no las hacía nadie.
 *
 * **Cada hora.** El plazo más corto que se vigila es el de confirmación de una
 * parte (24 h) y el más largo la reposición (días), así que una vuelta por hora
 * llega de sobra y mantiene barato el barrido. _Ojo:_ en el plan Hobby de Vercel
 * los crons solo corren una vez al día; con eso, una reserva vencida puede tardar
 * hasta 24 h en soltarse. Nada se descuadra —el barrido es idempotente— pero el
 * stock vuelve más tarde de lo que debería.
 */
export const config: VercelConfig = {
  crons: [{ path: "/api/cron", schedule: "0 * * * *" }],
};
