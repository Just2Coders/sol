/**
 * Las reglas del checkout que no necesitan la base, en puro.
 *
 * Sin `server-only` y sin `db`, igual que `lib/inventory/availability.ts`: son
 * las decisiones del dominio, no su lectura. Lo que sí va a la base —que el
 * item siga activo, qué precio rige, si el proveedor llega a la zona— vive en
 * `lib/orders/revalidate.ts`, que llama a esto con lo que trajo.
 *
 * Aquí está lo que se puede equivocar y cobrar de más o vender lo que no hay:
 * qué servicio se queda sin el equipo que iba a instalar, y hasta cuándo aguanta
 * el pedido. Las dos llevan tests.
 */

import { cartCoversService, type CartGroup, type CartLine } from "@/lib/cart/lines";
import {
  coversPaymentWindow,
  orderExpiresAt,
  reservationExpiresAt,
  ZELLE_WINDOW_HOURS,
} from "@/lib/inventory/holds";
import type { EquipmentScope } from "@/lib/services/enums";

/**
 * Una línea del carrito después de releerla en la base.
 *
 * Tiene la misma forma que la foto que mandó el cliente —para que el resto del
 * carrito la siga entendiendo— pero con los valores que de verdad se cobran, más
 * lo que el cliente nunca supo: el uuid del proveedor y, si es un servicio,
 * sobre qué equipo puede trabajar.
 */
export type PricedLine = CartLine & {
  supplierId: string;
  /** Solo lo lleva un servicio; `null` en el equipo. */
  equipmentScope: EquipmentScope | null;
};

/**
 * Los servicios que llegaron sin el equipo sobre el que trabajarían.
 *
 * Es la única validación que **no es por grupo sino entre grupos**: un `OWN`
 * necesita algo de su propio proveedor, un `PLATFORM` acepta lo de cualquiera, y
 * los dos pueden encontrarlo en la parte de otro. Por eso se pregunta sobre el
 * carrito entero y no dentro de cada parte.
 *
 * Un `ANY` nunca aparece aquí: también sirve para el equipo que el comprador
 * consiguió fuera, y ese la plataforma no lo conoce.
 */
export function servicesWithoutEquipment(lines: PricedLine[]): PricedLine[] {
  return lines.filter(
    (line) =>
      line.type === "SERVICE" &&
      line.equipmentScope !== null &&
      !cartCoversService(lines, {
        equipmentScope: line.equipmentScope,
        supplierSlug: line.supplierSlug,
      }),
  );
}

/**
 * Los servicios contratados sobre equipo que la plataforma no conoce.
 *
 * Un `ANY` es el único que puede llegar solo, y precisamente por eso nadie sabe
 * a qué va el instalador: el equipo lo consiguió el comprador por su cuenta. El
 * checkout le pide describirlo, y esa descripción es lo único que va a tener
 * quien se presente en la casa.
 */
export function servicesOnUnknownEquipment(lines: PricedLine[]): PricedLine[] {
  return lines.filter(
    (line) => line.type === "SERVICE" && line.equipmentScope === "ANY",
  );
}

/**
 * ¿Aparta mercancía esta parte?
 *
 * Una de solo servicios no retiene nada —la mano de obra no se agota en un
 * almacén—, así que su `reservation_hold_hours` no puede acortarle el plazo a
 * nadie. Es la distinción que decide quién entra en el reloj del pedido.
 */
export function partReserves(lines: CartLine[]): boolean {
  return lines.some((line) => line.type !== "SERVICE");
}

/** Lo que aporta una parte al reloj del pedido. */
export type PartHold = {
  supplierSlug: string;
  supplierName: string;
  /** El `reservation_hold_hours` del proveedor; `null` = el default. */
  holdHours: number | null;
  /** Si aparta mercancía (`partReserves`). */
  reserves: boolean;
};

export type CheckoutWindow = {
  /** Hasta cuándo aguanta el pedido. Es lo que se le enseña al comprador. */
  expiresAt: Date;
  /**
   * Quién pone ese límite, para poder decir **con quién** se acorta mientras
   * todavía se puede quitar del carrito. `null` cuando no lo pone nadie: ahí la
   * fecha es la del default de la plataforma.
   */
  tightest: PartHold | null;
  /**
   * Los que retienen menos de lo que tarda el medio de pago más lento. No es un
   * error —es su mercancía y él decide—, es un aviso: con ese plazo la compra
   * puede no llegar a completarse.
   */
  short: PartHold[];
};

/**
 * Hasta cuándo aguanta el pedido, y quién manda en esa fecha.
 *
 * Es el **más temprano** de los vencimientos de las partes que retienen algo, y
 * de él salen los otros dos plazos sin escribirlos: hasta cuándo puede pagar el
 * comprador y hasta cuándo puede decidir si algo se cae. Ver PLAN.md, «Los
 * relojes, que son uno solo».
 *
 * Un carrito solo de servicios no retiene nada y el mínimo saldría vacío: ahí
 * manda el default de la plataforma. Es el caso que se olvida y deja un pedido
 * sin vencimiento.
 *
 * El empate lo gana **la primera parte**, que es el orden en que el comprador
 * las armó: dos proveedores con el mismo plazo dan la misma fecha, y señalar al
 * segundo solo cambiaría el nombre del aviso.
 */
export function checkoutWindow(
  parts: PartHold[],
  now: Date,
  paymentWindowHours: number = ZELLE_WINDOW_HOURS,
): CheckoutWindow {
  const holding = parts.filter((part) => part.reserves);
  const expiries = holding.map((part) => reservationExpiresAt(now, part.holdHours));

  const earliest = orderExpiresAt(expiries);
  if (earliest === null) {
    return { expiresAt: reservationExpiresAt(now, null), tightest: null, short: [] };
  }

  return {
    expiresAt: earliest,
    tightest: holding[expiries.findIndex((at) => at.getTime() === earliest.getTime())],
    short: holding.filter(
      (part) => !coversPaymentWindow(part.holdHours, paymentWindowHours),
    ),
  };
}

/** Una parte del pedido ya releída: el grupo del carrito con lo que sabe el servidor. */
export type PricedGroup = CartGroup<PricedLine> & PartHold & { supplierId: string };
