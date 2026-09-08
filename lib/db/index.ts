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
