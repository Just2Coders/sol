import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * El cliente de base de datos, uno solo para todo el proyecto.
 *
 * Va por **WebSocket** (`neon-serverless`) y no por HTTP, y la razón es una:
 * `neon-http` no soporta transacciones —lo lanza explícitamente— y crear un
 * pedido son varias escrituras que o entran todas o no entra ninguna (la orden,
 * sus partes, sus líneas y la reserva de cada producto).
 *
 * Un cliente y no dos para no tener que recordar cuál se usa dónde: la regla
 * "HTTP para leer, Pool para escribir" se rompe la primera vez que alguien
 * escribe desde el sitio equivocado, y el fallo sería silencioso.
 *
 * El Pool vive a nivel de módulo a propósito: en Fluid Compute la instancia se
 * reutiliza entre peticiones, así que el coste de abrirlo se paga una vez. Un
 * script suelto que lo importe tiene que terminar con `process.exit`, o el
 * proceso se queda esperando al socket.
 *
 * Node 24 trae `WebSocket` global, así que no hace falta `neonConfig.
 * webSocketConstructor` ni el paquete `ws`.
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

/**
 * El handle de una transacción, tal como lo recibe el callback de
 * `db.transaction`.
 *
 * Se deriva del propio cliente en vez de nombrar los genéricos del driver:
 * son cuatro parámetros de tipo que cambian entre versiones de drizzle, y lo
 * único que importa es que quien escribe dentro de una transacción reciba
 * **esto** y no `db` — escribir por el cliente global desde dentro de una
 * transacción abre una segunda conexión, y esa escritura no se revierte.
 */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * "Escribe por aquí", sin decir si *aquí* es una transacción o el cliente suelto.
 *
 * Lo piden las operaciones que se usan de las dos formas: soltar las reservas de
 * una parte es un paso más dentro de la transacción que la rechaza, y también es
 * el barrido entero que corre el cron por su cuenta. Sin esto habría dos copias
 * de la misma escritura, y la que se usa menos es la que se queda atrás.
 *
 * No lo piden las que **solo** valen dentro de una transacción: esas reciben el
 * `Tx` como primer parámetro y obligatorio (`reserveForPart`), porque ahí
 * poder pasar `db` sería justo el error.
 */
export type Executor = Pick<Tx, "select" | "insert" | "update" | "execute">;

// El cliente suelto tiene que valer como ejecutor, y esto lo comprueba al
// compilar en vez de al llamar.
db satisfies Executor;
