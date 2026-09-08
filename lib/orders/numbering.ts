/**
 * El número que nombra un pedido, en puro.
 *
 * No es decoración: es lo que el comprador escribe como concepto del Zelle y lo
 * que el admin busca al conciliarlo contra el banco, así que tiene que caber en
 * un mensaje de texto y poder dictarse por teléfono sin deletrear. El uuid del
 * pedido no sirve para eso.
 */

/** Cabecera del número. Corta y siempre la misma: es la que se busca. */
const PREFIX = "SOL";

/** Dígitos mínimos, para que todos los números tengan la misma forma. */
const DIGITS = 4;

/**
 * `1042` → `SOL-1042`.
 *
 * El valor viene de la secuencia `order_number_seq` (migración 0008): leerlo e
 * incrementarlo es el mismo acto, así que dos checkouts simultáneos no pueden
 * sacar el mismo número. Aquí solo se le da forma.
 *
 * Se rellena con ceros hasta cuatro dígitos, no se corta a partir de ahí: el día
 * que la plataforma pase de diez mil pedidos, `SOL-10000` es el número correcto y
 * truncarlo lo haría chocar con uno que ya existe.
 */
export function formatOrderNumber(sequence: number): string {
  return `${PREFIX}-${String(Math.trunc(sequence)).padStart(DIGITS, "0")}`;
}
