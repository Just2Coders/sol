import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  kits,
  priceSchedules,
  products,
  services,
  supplierZones,
  zones,
} from "@/lib/db/schema";
import { cartGroups, cartSubtotalUsd, type CartLine } from "@/lib/cart/lines";
import { availableUnits, kitAvailableUnits } from "@/lib/inventory/availability";
import type { KitPiece } from "@/lib/inventory/reservation-plan";
import { effectivePrice } from "@/lib/pricing/effective";
import {
  checkoutWindow,
  partReserves,
  servicesOnUnknownEquipment,
  servicesWithoutEquipment,
  type CheckoutWindow,
  type PricedGroup,
  type PricedLine,
} from "./checkout-rules";

/**
 * El carrito, releído contra la base antes de cobrarlo.
 *
 * Lo que llega del cliente es una **foto**: el visitante pudo tenerla abierta
 * media hora, o pudo editarla a mano. Nada de lo que manda se usa para cobrar
 * —ni el precio, ni el nombre, ni de quién es cada cosa—; de la petición solo se
 * respetan el par tipo + id y la cantidad, y todo lo demás se vuelve a leer.
 *
 * Y cuando algo falla **se para el checkout y se dice cuál**, nunca se descarta
 * una línea en silencio: un pedido que se recorta solo es el que genera la
 * llamada.
 *
 * El precio sale de `price_schedules` y no de la columna `price_usd`, que es su
 * caché: si el cron que promueve los vencidos llega tarde, el listado se queda
 * desfasado un rato pero aquí nunca se cobra mal.
 */

/** Lo que el cliente puede pedir de una línea. Lo demás lo pone el servidor. */
export type CartRequest = Pick<CartLine, "type" | "id" | "quantity">;

/**
 * Algo que impide cobrar el carrito tal como está.
 *
 * Lleva el mensaje ya escrito porque todos se redactan igual —qué pasó y con
 * qué— y repartirlos por la UI los desalinearía; y lleva el proveedor para poder
 * señalar el grupo del resumen en el que hay que mirar.
 */
export type CheckoutProblem = {
  kind: "empty" | "zone" | "gone" | "price" | "stock" | "coverage" | "equipment";
  message: string;
  supplierSlug: string | null;
};

/** La zona donde se entrega o se hace la obra, ya resuelta. */
export type DeliveryZone = { id: string; name: string; slug: string };

/**
 * El pedido tal como quedaría: lo que se enseña en el resumen.
 *
 * Se devuelve **también cuando algo falla**, con las líneas que sí se pudieron
 * leer. Vaciar la pantalla ante un problema dejaría al comprador sin ver lo que
 * está a punto de pagar justo cuando más necesita mirarlo; los problemas van al
 * lado y dicen qué quitar.
 */
export type CartSummary = {
  /** `null` solo si la zona pedida no existe. */
  zone: DeliveryZone | null;
  groups: PricedGroup[];
  /** Piezas de cada kit del carrito: lo que hay que retener por él. */
  compositions: Map<string, KitPiece[]>;
  subtotalUsd: number;
  window: CheckoutWindow;
  /** Hay algún servicio `ANY`: el instalador no sabe a qué va si nadie se lo dice. */
  needsEquipmentNote: boolean;
};

export type RevalidatedCart = CartSummary & { problems: CheckoutProblem[] };

/** Un carrito sin nada que lo frene. Es la única forma de entrar a `placeOrder`. */
export type PlaceableCart = CartSummary & { zone: DeliveryZone };

/**
 * El carrito, si de verdad se puede cobrar.
 *
 * Una función y no un booleano porque lo que hace falta después es el tipo: sin
 * esto, `placeOrder` tendría que volver a comprobar que hay zona y confiar en
 * que quien la llamó miró los problemas.
 */
export function placeable(cart: RevalidatedCart): PlaceableCart | null {
  if (cart.problems.length > 0 || cart.zone === null) return null;
  return { ...cart, zone: cart.zone };
}

/**
 * Las zonas que valen como "este proveedor llega hasta aquí".
 *
 * Sube por la jerarquía, al revés que el filtro del catálogo. Quien cubre toda
 * la provincia entrega en cualquier municipio suyo; quien solo cubre un
 * municipio **no** entrega en el resto de la provincia, aunque el catálogo se lo
 * enseñe a quien filtró por ella. Allí se pregunta "¿quién opera por aquí?" y
 * aquí "¿me lo llevas a esta puerta?", que no es la misma pregunta.
 */
function deliveryScope(zone: { id: string; parentId: string | null }): string[] {
  return zone.parentId ? [zone.id, zone.parentId] : [zone.id];
}

type SupplierRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  reservationHoldHours: number | null;
};

/** Lo que hace falta de un item para decidir si se puede cobrar y a cuánto. */
type Priced = {
  id: string;
  name: string;
  slug: string;
  images: string[];
  active: boolean;
  supplier: SupplierRow;
};

type ProductRow = Priced & { stock: number; reserved: number };
type KitRow = { kit: Priced; pieces: (KitPiece & { stock: number; reserved: number })[] };
type ServiceRow = Priced & {
  pricing: "FLAT" | "PER_UNIT";
  unitLabel: string | null;
  equipmentScope: "OWN" | "PLATFORM" | "ANY";
};

export async function revalidateCart({
  requests,
  zoneSlug,
  now = new Date(),
}: {
  requests: CartRequest[];
  zoneSlug: string;
  now?: Date;
}): Promise<RevalidatedCart> {
  const nothing = (problem: CheckoutProblem): RevalidatedCart => ({
    zone: null,
    groups: [],
    compositions: new Map(),
    subtotalUsd: 0,
    window: checkoutWindow([], now),
    needsEquipmentNote: false,
    problems: [problem],
  });

  if (requests.length === 0) {
    return nothing({
      kind: "empty",
      message: "El carrito está vacío.",
      supplierSlug: null,
    });
  }

  const zone = await db.query.zones.findFirst({
    where: eq(zones.slug, zoneSlug),
    columns: { id: true, name: true, slug: true, parentId: true },
  });
  if (!zone) {
    // Sin zona no hay contra qué comparar `supplier_zones`, así que tampoco hay
    // resumen: no se sabe todavía quién puede entregar nada de esto.
    return nothing({
      kind: "zone",
      message: "Elige dónde se entrega el pedido.",
      supplierSlug: null,
    });
  }

  const idsOf = (type: CartLine["type"]) =>
    requests.filter((request) => request.type === type).map((request) => request.id);

  const [productRows, kitRows, serviceRows, priceRows, coverageRows] = await Promise.all([
    findProducts(idsOf("PRODUCT")),
    findKits(idsOf("KIT")),
    findServices(idsOf("SERVICE")),
    findPrices(requests),
    findCoverage(deliveryScope(zone)),
  ]);

  const covers = new Set(coverageRows.map((row) => row.supplierId));
  const problems: CheckoutProblem[] = [];
  const lines: PricedLine[] = [];
  const compositions = new Map<string, KitPiece[]>();

  for (const request of requests) {
    const product = request.type === "PRODUCT" ? productRows.get(request.id) : undefined;
    const kit = request.type === "KIT" ? kitRows.get(request.id) : undefined;
    const service = request.type === "SERVICE" ? serviceRows.get(request.id) : undefined;
    const item: Priced | undefined = product ?? kit?.kit ?? service;

    if (!item || !item.active) {
      problems.push({
        kind: "gone",
        message:
          "Uno de los artículos del carrito ya no está a la venta. Quítalo para seguir.",
        supplierSlug: null,
      });
      continue;
    }

    if (!item.supplier.active) {
      problems.push({
        kind: "gone",
        message: `${item.supplier.name} ya no opera en Solaris. Quita «${item.name}» para seguir.`,
        supplierSlug: item.supplier.slug,
      });
      continue;
    }

    if (!covers.has(item.supplier.id)) {
      problems.push({
        kind: "coverage",
        message: `${item.supplier.name} no llega hasta ${zone.name}. Cambia la zona de entrega o quita «${item.name}».`,
        supplierSlug: item.supplier.slug,
      });
      continue;
    }

    const priceUsd = effectivePrice(
      priceRows.get(`${request.type}:${request.id}`) ?? [],
      now,
    );
    if (priceUsd === null) {
      problems.push({
        kind: "price",
        message: `«${item.name}» todavía no tiene precio en vigor. Quítalo para seguir.`,
        supplierSlug: item.supplier.slug,
      });
      continue;
    }

    // Un precio cerrado se cobra una vez por mucho que suba el contador: la
    // cantidad solo significa algo cuando se cobra por unidad de obra.
    const quantity = service?.pricing === "FLAT" ? 1 : request.quantity;

    if (product ?? kit) {
      const available = product
        ? availableUnits(product)
        : kitAvailableUnits(kit!.pieces);

      if (available < quantity) {
        problems.push({
          kind: "stock",
          message:
            available === 0
              ? `«${item.name}» se agotó mientras estaba en el carrito.`
              : `De «${item.name}» solo quedan ${available}, y pediste ${quantity}.`,
          supplierSlug: item.supplier.slug,
        });
        continue;
      }
    }

    if (kit) {
      compositions.set(
        item.id,
        kit.pieces.map((piece) => ({
          productId: piece.productId,
          quantity: piece.quantity,
        })),
      );
    }

    lines.push({
      type: request.type,
      id: item.id,
      slug: item.slug,
      name: item.name,
      priceUsd,
      unitLabel: service?.unitLabel ?? null,
      image: item.images[0] ?? null,
      quantity,
      supplierId: item.supplier.id,
      supplierSlug: item.supplier.slug,
      supplierName: item.supplier.name,
      // La foto de stock que trae el cliente no se devuelve: lo vendible ya se
      // comprobó aquí, y el número que de verdad manda es el de la reserva.
      stock: null,
      equipmentScope: service?.equipmentScope ?? null,
    });
  }

  // Entre grupos, no dentro de uno: el equipo de un `PLATFORM` puede estar en la
  // parte de otro proveedor, así que se pregunta sobre el carrito ya completo.
  for (const orphan of servicesWithoutEquipment(lines)) {
    problems.push({
      kind: "equipment",
      message: `«${orphan.name}» es un trabajo sobre equipo comprado en Solaris, y no hay ninguno en el carrito.`,
      supplierSlug: orphan.supplierSlug,
    });
  }

  const holdHours = new Map<string, number | null>();
  for (const row of [...productRows.values(), ...serviceRows.values()]) {
    holdHours.set(row.supplier.id, row.supplier.reservationHoldHours);
  }
  for (const row of kitRows.values()) {
    holdHours.set(row.kit.supplier.id, row.kit.supplier.reservationHoldHours);
  }

  const groups: PricedGroup[] = cartGroups(lines).map((group) => ({
    ...group,
    supplierId: group.lines[0].supplierId,
    holdHours: holdHours.get(group.lines[0].supplierId) ?? null,
    reserves: partReserves(group.lines),
  }));

  return {
    zone: { id: zone.id, name: zone.name, slug: zone.slug },
    groups,
    compositions,
    subtotalUsd: cartSubtotalUsd(lines),
    window: checkoutWindow(groups, now),
    needsEquipmentNote: servicesOnUnknownEquipment(lines).length > 0,
    problems,
  };
}

// ─── Lecturas ────────────────────────────────────────────────────────────────
// Cada una devuelve un mapa por id: el bucle de arriba pregunta línea a línea y
// no puede permitirse un viaje a la base por cada una.

const supplierColumns = {
  columns: {
    id: true,
    name: true,
    slug: true,
    active: true,
    reservationHoldHours: true,
  },
} as const;

async function findProducts(ids: string[]): Promise<Map<string, ProductRow>> {
  if (ids.length === 0) return new Map();

  const rows = await db.query.products.findMany({
    where: inArray(products.id, ids),
    columns: {
      id: true,
      name: true,
      slug: true,
      images: true,
      active: true,
      stock: true,
      reserved: true,
    },
    with: { supplier: supplierColumns },
  });

  return new Map(rows.map((row) => [row.id, row]));
}

async function findKits(ids: string[]): Promise<Map<string, KitRow>> {
  if (ids.length === 0) return new Map();

  const rows = await db.query.kits.findMany({
    where: inArray(kits.id, ids),
    columns: { id: true, name: true, slug: true, images: true, active: true },
    with: {
      supplier: supplierColumns,
      // Un kit no tiene existencias propias: lo vendible es la derivada de sus
      // piezas, y son ellas las que se retienen.
      items: {
        columns: { productId: true, quantity: true },
        with: { product: { columns: { stock: true, reserved: true } } },
      },
    },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        kit: row,
        pieces: row.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          stock: item.product.stock,
          reserved: item.product.reserved,
        })),
      },
    ]),
  );
}

async function findServices(ids: string[]): Promise<Map<string, ServiceRow>> {
  if (ids.length === 0) return new Map();

  const rows = await db.query.services.findMany({
    where: inArray(services.id, ids),
    columns: {
      id: true,
      name: true,
      slug: true,
      images: true,
      active: true,
      pricing: true,
      unitLabel: true,
      equipmentScope: true,
    },
    with: { supplier: supplierColumns },
  });

  return new Map(rows.map((row) => [row.id, row]));
}

/** La línea de tiempo de precios de todo el carrito, en un viaje. */
async function findPrices(
  requests: CartRequest[],
): Promise<Map<string, { priceUsd: number; startsAt: Date }[]>> {
  const rows = await db
    .select({
      targetType: priceSchedules.targetType,
      targetId: priceSchedules.targetId,
      priceUsd: priceSchedules.priceUsd,
      startsAt: priceSchedules.startsAt,
    })
    .from(priceSchedules)
    .where(
      inArray(
        priceSchedules.targetId,
        requests.map((request) => request.id),
      ),
    );

  // Por el par y no por el id suelto: `target_id` es una FK blanda a tres
  // tablas, y dos de ellas podrían repetir un uuid sin que fuera un error.
  const timelines = new Map<string, { priceUsd: number; startsAt: Date }[]>();
  for (const row of rows) {
    const key = `${row.targetType}:${row.targetId}`;
    const timeline = timelines.get(key);
    if (timeline) timeline.push(row);
    else timelines.set(key, [row]);
  }
  return timelines;
}

/** Quién entrega en el ámbito de la zona elegida. */
function findCoverage(zoneIds: string[]) {
  return db
    .selectDistinct({ supplierId: supplierZones.supplierId })
    .from(supplierZones)
    .where(inArray(supplierZones.zoneId, zoneIds));
}
