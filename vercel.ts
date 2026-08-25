import type { VercelConfig } from "@vercel/config/v1";

/**
 * Configuración del proyecto en Vercel.
 *
 * Existe por el cron: hay tres cosas que tienen que pasar sin que nadie las
 * pida —soltar una reserva vencida, caducar un anuncio pasado de ventana y
 * promover un precio programado— y hasta ahora no las hacía nadie.
 *
 * **Una vez al día**, que es lo que permite el plan Hobby de Vercel: una
 * expresión más frecuente hace fallar el despliegue entero, no solo el cron.
 *
 * Que solo corra de madrugada **no le hace daño a la venta**, y eso es
 * deliberado: `reserveForPart` suelta las reservas vencidas de los productos que
 * va a retener justo antes de retenerlos, así que una unidad bloqueada por un
 * carrito abandonado se libera en cuanto alguien intenta comprarla, no cuando
 * pase el cron. Este barrido es la red de seguridad —deja el saldo ordenado,
 * caduca los anuncios olvidados y promueve los precios programados—, no la
 * garantía.
 *
 * Las 3:00 UTC son de madrugada en Cuba (UTC−4/−5): el barrido cae cuando menos
 * gente hay comprando.
 */
export const config: VercelConfig = {
  crons: [{ path: "/api/cron", schedule: "0 3 * * *" }],
};
