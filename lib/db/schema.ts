import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Nota sobre índices: Postgres **no** indexa una foreign key por el hecho de
 * serlo — solo la clave primaria y los `unique`. Cada índice declarado aquí
 * abajo cubre un camino de lectura que existe hoy en el código; si uno deja de
 * usarse, se borra (un índice de más encarece cada escritura).
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRole = pgEnum("user_role", ["ADMIN", "CUSTOMER"]);

export const orderStatus = pgEnum("order_status", [
  "PENDING_PAYMENT", // orden creada, esperando que el cliente pague
  "PAYMENT_REPORTED", // cliente reportó el pago, esperando verificación
  "PAID", // pago confirmado por el admin
  "COMPLETED", // entregado / cerrado
  "CANCELLED",
]);

export const paymentMethod = pgEnum("payment_method", ["ZELLE", "SUBY"]);

export const paymentStatus = pgEnum("payment_status", [
  "PENDING", // creado junto con la orden, sin reporte aún
  "REPORTED", // cliente envió referencia/comprobante
  "CONFIRMED", // admin verificó el pago en el banco
  "REJECTED", // admin lo rechazó (referencia inválida, monto errado, etc.)
]);

export const orderItemType = pgEnum("order_item_type", ["PRODUCT", "KIT", "SERVICE"]);

/**
 * Cómo va la entrega de **la parte de un proveedor**, no la del pedido entero.
 *
 * El pago es global —se cobra o no se cobra el pedido completo, ver
 * `orderStatus`— pero la entrega es de cada uno por su lado: uno puede haber
 * llevado ya su batería mientras el otro todavía no monta los paneles. Y una
 * parte se puede caer sola (`CANCELLED`: sin stock, el proveedor no puede) sin
 * arrastrar al resto del pedido.
 */
export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "PENDING", // aún no entregado
  "DELIVERED", // este proveedor ya entregó lo suyo
  "CANCELLED", // esta parte se cayó; el resto del pedido sigue
]);

/**
 * Cómo se calcula el precio de un servicio.
 *
 * `FLAT` es un precio cerrado por trabajo ("instalación del kit, 350 USD");
 * `PER_UNIT` multiplica por las unidades de obra que pide el cliente ("25 USD
 * por panel"), y esas unidades son la `quantity` de la línea.
 *
 * No hay `QUOTE` (a presupuestar) a propósito: un item sin precio no puede ser
 * una línea de carrito ni pasar por el checkout, así que necesitaría su propio
 * flujo de solicitud → cotización. Cuando exista, es un valor más del enum.
 */
export const servicePricing = pgEnum("service_pricing", ["FLAT", "PER_UNIT"]);

/** Lo que se puede instalar: un producto suelto o un kit. Nunca otro servicio. */
export const installableType = pgEnum("installable_type", ["PRODUCT", "KIT"]);

/**
 * Sobre qué equipo trabaja un servicio. De más estrecho a más ancho.
 *
 * `PLATFORM` y `ANY` son los dos "acepto equipo ajeno" y casi siempre se
 * preguntan juntos (`scope !== "OWN"`). Se separan en una sola cosa, pero
 * decisiva: **de quién es el equipo es un dato mientras lo vendiera Solaris**
 * —está en `order_items` de un pedido pagado, con su proveedor al lado— y una
 * promesa del cliente cuando viene de fuera. Por eso solo `ANY` puede
 * contratarse a ciegas desde su propia ficha; los otros dos tienen que llegar
 * con su equipo.
 */
export const equipmentScope = pgEnum("equipment_scope", [
  "OWN", // solo lo que vendió su propio proveedor
  "PLATFORM", // también lo que vendió otro proveedor de Solaris
  "ANY", // también lo que el comprador consiguió fuera de la plataforma
]);

/**
 * Por qué cambió el saldo de un producto.
 *
 * `products.stock` es el saldo y esto es el porqué: cada fila del libro mayor
 * lleva su motivo, y la invariante `stock = sum(delta)` se puede comprobar con
 * una query. Ninguna otra cosa escribe stock.
 */
export const stockMovementReason = pgEnum("stock_movement_reason", [
  "OPENING", // saldo de apertura: lo que había el día que nació el libro
  "RESTOCK", // llegó una reposición
  "SALE", // se cobró un pedido y su reserva se consumió
  /**
   * **Sin uso hoy, y a propósito.** Soltar una reserva no mueve el saldo: la
   * mercancía nunca salió del almacén, solo estaba apartada — lo que baja es
   * `products.reserved`, que no es el libro mayor. Se queda en el enum porque
   * retirar un valor en Postgres obliga a recrear el tipo y reescribir cada
   * columna que lo use, un coste sin ninguna ganancia. Si algún día una reserva
   * llegara a descontar `stock` directamente, este es su motivo.
   */
  "RELEASE",
  "ADJUSTMENT", // recuento manual del proveedor
  "LOSS", // rotura, robo, merma
  "RETURN", // el cliente devolvió
]);

/**
 * Una reserva de stock nace `HELD` y muere de una de dos formas: se cobra
 * (`CONSUMED`, y ahí baja el saldo con un `SALE`) o se suelta (`RELEASED`,
 * porque el proveedor rechazó, venció el plazo o se canceló).
 */
export const reservationStatus = pgEnum("reservation_status", [
  "HELD",
  "CONSUMED",
  "RELEASED",
]);

/**
 * La reposición prometida: una intención con fecha borrosa, no un hecho.
 *
 * `ANNOUNCED` es lo único que el catálogo enseña, y solo mientras su ventana no
 * haya pasado. `EXPIRED` lo pone el cron cuando `eta_to` quedó atrás sin que
 * nadie la resolviera — para que el proveedor la vea en su lista, no para
 * enseñarla al comprador.
 */
export const restockStatus = pgEnum("restock_status", [
  "ANNOUNCED",
  "ARRIVED",
  "CANCELLED",
  "EXPIRED",
]);

/**
 * Qué puede tener precio. Coincide con `order_item_type` en sus tres valores,
 * pero se declara aparte porque responde a otra pregunta: uno dice qué cabe en
 * una línea de pedido y este qué se puede tarifar.
 */
export const priceableType = pgEnum("priceable_type", ["PRODUCT", "KIT", "SERVICE"]);

// ─── Zonas ───────────────────────────────────────────────────────────────────
// Jerarquía simple: estado (parentId null) → ciudad/municipio (parentId = estado).

export const zones = pgTable(
  "zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    parentId: uuid("parent_id").references((): AnyPgColumn => zones.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Toda lectura de la jerarquía baja por aquí: el árbol del admin, el selector
  // del registro y el ámbito del catálogo (provincia + sus municipios).
  (t) => [index("zones_parent_id_idx").on(t.parentId)],
);

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("CUSTOMER"),
  phone: text("phone"),
  zoneId: uuid("zone_id").references(() => zones.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Proveedores ─────────────────────────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  // Datos para liquidarle manualmente (banco, zelle, etc.). Solo visible para el admin.
  payoutInfo: text("payout_info"),
  /**
   * Con qué alcance **nacen** sus servicios: es el valor que trae puesto el
   * formulario, y nada más. Ninguna consulta lo lee para resolver qué se ofrece
   * —eso siempre sale de `services.equipmentScope`, que va escrito en la fila—,
   * así que cambiarlo no mueve los servicios que ya existen.
   */
  defaultEquipmentScope: equipmentScope("default_equipment_scope").notNull().default("OWN"),
  /**
   * Cuántas horas aguanta reservado lo suyo mientras el comprador paga.
   *
   * Lo decide él porque el coste es suyo: retener mercancía es no vendérsela al
   * que entra por la puerta. `null` = las horas por defecto de la plataforma.
   *
   * **Se lee una sola vez**, al crear la reserva, y el resultado queda escrito
   * en su `expires_at` — mismo criterio que el snapshot de precio: cambiar de
   * idea mañana no mueve los pedidos que ya están en curso.
   */
  reservationHoldHours: integer("reservation_hold_hours"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplierZones = pgTable(
  "supplier_zones",
  {
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.supplierId, t.zoneId] }),
    // El PK ya sirve "qué zonas cubre este proveedor". El catálogo pregunta lo
    // contrario —"qué proveedores llegan a esta zona"— y con la clave compuesta
    // en ese orden Postgres no puede usarla.
    index("supplier_zones_zone_id_idx").on(t.zoneId),
  ],
);

/**
 * La solicitud de alta que deja quien quiere vender en Solaris, desde `/sell`.
 *
 * No es un `supplier`: nace sin revisar, y el alta la hace el equipo a mano —
 * ver la letra pequeña de esa página. `province` va en texto libre y no como
 * FK a `zones` porque las provincias reales de Cuba todavía no están
 * sembradas ahí (hoy `zones` solo tiene el árbol de ejemplo del seed); el día
 * que lo estén, esta columna puede migrar a `zoneId` sin tocar el resto.
 */
export const supplierLeads = pgTable("supplier_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  business: text("business").notNull(),
  province: text("province").notNull(),
  contact: text("contact").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Productos y kits ────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    // Ficha técnica flexible: { potencia: "450W", voltaje: "24V", ... }
    specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
    /**
     * El precio efectivo de hoy. Es una **caché** de `price_schedules`, que es
     * la verdad: el listado ordena y filtra por rango sobre esta columna
     * indexada, y resolverlo por fila con un lateral join sería pagar la
     * temporalidad en la consulta más caliente del sitio. El checkout no la
     * lee: relee el schedule.
     */
    priceUsd: numeric("price_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
    /** Lo que hay en el almacén. El porqué de cada cambio vive en `stock_movements`. */
    stock: integer("stock").notNull().default(0),
    /**
     * Lo comprometido por pedidos que aún no se han cobrado. **Vendible =
     * `stock - reserved`**, y esa resta es la que miran el catálogo, la ficha y
     * el checkout. Es la suma de las reservas `HELD`, cacheada aquí por la
     * misma razón que el precio: la tarjeta la necesita por fila.
     */
    reserved: integer("reserved").notNull().default(0),
    images: text("images").array().notNull().default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // El catálogo entra siempre por proveedor + activo, y el admin lista por
    // proveedor: el mismo índice sirve a los dos.
    index("products_supplier_id_active_idx").on(t.supplierId, t.active),
    // El orden por precio y el filtro de rango se resuelven con este.
    index("products_price_usd_idx").on(t.priceUsd),
  ],
);

export const kits = pgTable(
  "kits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    // Precio propio del kit (normalmente menor que la suma de sus productos).
    priceUsd: numeric("price_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
    images: text("images").array().notNull().default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("kits_supplier_id_active_idx").on(t.supplierId, t.active),
    index("kits_price_usd_idx").on(t.priceUsd),
  ],
);

export const kitItems = pgTable(
  "kit_items",
  {
    kitId: uuid("kit_id")
      .notNull()
      .references(() => kits.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.kitId, t.productId] }),
    // El PK cubre "las piezas de este kit". Falta el reverso: "en qué kits
    // entra este producto", que es lo que mira el borrado de un producto.
    index("kit_items_product_id_idx").on(t.productId),
  ],
);

// ─── Servicios (instalación) ─────────────────────────────────────────────────
// Un servicio es mano de obra, no mercancía: no tiene existencias ni entrega, y
// su precio puede depender de la obra. Por eso vive en su propia tabla en vez de
// ser un producto con `stock` fingido — el stock, el envío y la ficha técnica no
// significan nada aquí. Lo presta el mismo proveedor que vende (un instalador
// puro es un proveedor sin productos), así que sigue valiendo la regla de un
// solo proveedor por orden y la cobertura sale ya resuelta de `supplier_zones`.

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  // El orden en que el admin quiere verlas listadas; el desempate es el nombre.
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    // Sin `onDelete`: una categoría en uso no se borra sin recolocar sus
    // servicios (Postgres lo impide con NO ACTION, que es el default).
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategories.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    pricing: servicePricing("pricing").notNull().default("FLAT"),
    priceUsd: numeric("price_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
    // La unidad de obra que se multiplica ("panel", "metro de cable"). Solo
    // tiene sentido con `pricing = PER_UNIT`; en `FLAT` va null.
    unitLabel: text("unit_label"),
    // Sobre qué equipo trabaja. El default cerrado no es pereza: abrirse a
    // equipo ajeno significa responder por lo que no vendiste, y eso se decide
    // a mano.
    equipmentScope: equipmentScope("equipment_scope").notNull().default("OWN"),
    images: text("images").array().notNull().default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Los mismos dos caminos que productos y kits: el catálogo entra por
    // proveedor + activo, y el precio ordena y filtra el listado unificado.
    index("services_supplier_id_active_idx").on(t.supplierId, t.active),
    index("services_price_usd_idx").on(t.priceUsd),
    index("services_category_id_idx").on(t.categoryId),
  ],
);

/**
 * Qué instalación se ofrece junto a qué producto o kit.
 *
 * Es lo que alimenta el "añadir instalación" de una ficha. Se modela aparte —y
 * no como una columna en `kits`— porque un mismo servicio sirve a muchos items y
 * un item puede tener más de una opción (instalación básica, instalación con
 * permisos). Sin ninguna fila aquí el servicio sigue vendiéndose solo, desde su
 * propia ficha del catálogo.
 *
 * `targetId` es una FK "blanda" a `products.id` o `kits.id` según `targetType`,
 * igual que `order_items.itemId`.
 */
export const installationOffers = pgTable(
  "installation_offers",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    targetType: installableType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.serviceId, t.targetType, t.targetId] }),
    // El PK cubre "a qué items se ofrece este servicio". La ficha pregunta lo
    // contrario —"qué instalación puedo añadir a este kit"—, que es el camino
    // que de verdad se lee en cada visita.
    index("installation_offers_target_idx").on(t.targetType, t.targetId),
  ],
);

// ─── Órdenes ─────────────────────────────────────────────────────────────────
// Un pedido puede llevar cosas de varios proveedores y se paga **una sola vez**
// a la cuenta central: partir el Zelle sería peor para quien compra y peor para
// conciliar. Lo que se parte es por dentro — `orders` es lo que el cliente
// compró y pagó, y `order_suppliers` la parte que le toca a cada proveedor, con
// su subtotal escrito y su propio estado de entrega.

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Número corto legible para el cliente y como referencia del Zelle (SOL-1042).
  orderNumber: text("order_number").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  // Dónde se entrega. Es lo que se compara contra `supplier_zones` para saber si
  // **todos** los proveedores del pedido llegan hasta ahí.
  zoneId: uuid("zone_id").references(() => zones.id),
  status: orderStatus("status").notNull().default("PENDING_PAYMENT"),
  subtotalUsd: numeric("subtotal_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
  totalUsd: numeric("total_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * La parte del pedido que le toca a un proveedor.
 *
 * Es la fila que se liquida —su `subtotalUsd` es exactamente lo que hay que
 * pagarle, escrito al comprar y no recalculado en cada lectura, igual que los
 * snapshots de `order_items`— y la que puede cancelarse sola sin tocar el resto
 * del pedido.
 *
 * Sin `onDelete` hacia `suppliers`: un proveedor con partes de pedido a su
 * nombre no se borra, se desactiva (se perdería la trazabilidad de lo que se le
 * liquidó). La guarda está en `app/actions/suppliers.ts`.
 */
export const orderSuppliers = pgTable(
  "order_suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    subtotalUsd: numeric("subtotal_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
    status: fulfillmentStatus("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Un proveedor no puede aparecer dos veces en el mismo pedido: sus líneas
    // van todas a la misma parte, o el subtotal deja de significar nada. De
    // paso, su columna izquierda resuelve "las partes de este pedido".
    unique("order_suppliers_order_id_supplier_id_key").on(t.orderId, t.supplierId),
    // El camino contrario —"qué le debo a este proveedor"—, que es por donde
    // entran la liquidación y la guarda de borrado de proveedores.
    index("order_suppliers_supplier_id_idx").on(t.supplierId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // La línea cuelga de la parte de su proveedor, no del pedido: así sabe quién
    // la entrega sin repetir la columna, y el subtotal de la parte es la suma de
    // sus líneas y de ninguna otra.
    orderSupplierId: uuid("order_supplier_id")
      .notNull()
      .references(() => orderSuppliers.id, { onDelete: "cascade" }),
    itemType: orderItemType("item_type").notNull(),
    // FK "blanda": apunta a products.id, kits.id o services.id según itemType.
    itemId: uuid("item_id").notNull(),
    // Snapshot al momento de la compra: cambios de precio/nombre posteriores
    // no alteran órdenes existentes.
    nameSnapshot: text("name_snapshot").notNull(),
    priceSnapshotUsd: numeric("price_snapshot_usd", {
      precision: 10,
      scale: 2,
      mode: "number",
    }).notNull(),
    // Unidades pedidas. En un servicio `PER_UNIT` son las unidades de obra
    // (paneles a montar, metros de cable); en uno `FLAT`, siempre 1.
    quantity: integer("quantity").notNull().default(1),
  },
  // Las líneas se leen siempre por su parte, y el borrado en cascada de un
  // pedido baja por aquí (Postgres no indexa una FK por serlo).
  (t) => [index("order_items_order_supplier_id_idx").on(t.orderSupplierId)],
);

// ─── Pagos ───────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: paymentMethod("method").notNull().default("ZELLE"),
  status: paymentStatus("status").notNull().default("PENDING"),
  zelleReference: text("zelle_reference"),
  receiptUrl: text("receipt_url"),
  rejectionReason: text("rejection_reason"),
  reportedAt: timestamp("reported_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedBy: uuid("confirmed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Inventario ──────────────────────────────────────────────────────────────
// Tres cosas que hoy eran un escalar y no lo son: lo que hay, lo que se promete
// y lo que vale. Ver «Inventario, reposiciones y precio en el tiempo» en
// PLAN.md — aquí solo está la forma.

/**
 * El libro mayor del stock: solo se añade, nunca se edita ni se borra.
 *
 * `products.stock` es el saldo y esto explica cada cambio, así que el histórico
 * sale gratis y la doble contabilidad es segura porque su invariante es
 * comprobable: **`products.stock = sum(delta)` por producto**. Nada más escribe
 * stock; todo pasa por `lib/inventory/`.
 *
 * Firma con el usuario **real** más a nombre de quién actuó. Así el histórico
 * dice "el admin ajustó el stock de Solar Caribe" y nunca miente, que es justo
 * lo que se pierde si suplantar fuera cambiar de sesión.
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Con signo: `+20` una reposición, `-3` una venta. */
    delta: integer("delta").notNull(),
    reason: stockMovementReason("reason").notNull(),
    /**
     * De qué parte de pedido salió, cuando el motivo es una venta o la
     * liberación de su reserva. `set null` al borrarse: el pedido se puede ir,
     * el movimiento que explica el saldo de hoy no.
     */
    orderSupplierId: uuid("order_supplier_id").references(() => orderSuppliers.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    /** Quién lo hizo de verdad. Nulo cuando lo escribe el cron. */
    actorUserId: uuid("actor_user_id").references(() => users.id),
    /** En nombre de quién actuaba. Nulo si actuaba por sí mismo. */
    onBehalfOfSupplierId: uuid("on_behalf_of_supplier_id").references(() => suppliers.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // El histórico de un producto se lee siempre del más reciente hacia atrás, y
    // la comprobación de la invariante entra por el mismo sitio.
    index("stock_movements_product_id_occurred_at_idx").on(t.productId, t.occurredAt),
  ],
);

/**
 * Lo comprometido por un pedido que todavía no se ha cobrado.
 *
 * Con pago manual pasan días entre "pedido creado" y "pago confirmado". Si el
 * stock bajara al confirmar, dos personas comprarían el último panel y a una
 * habría que devolverle; si bajara al hacer checkout, un carrito abandonado
 * mataría esa unidad para siempre. Por eso se retiene con vencimiento.
 *
 * Cuelga de `order_suppliers` y no del pedido: así cancelar la parte de un
 * proveedor devuelve **solo** su stock. Invariante:
 * `products.reserved = sum(quantity)` de las `HELD`.
 */
export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderSupplierId: uuid("order_supplier_id")
      .notNull()
      .references(() => orderSuppliers.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    /**
     * Absoluto y escrito una sola vez, con el `reservation_hold_hours` que el
     * proveedor tenía en ese momento. Si mañana cambia de idea, esta reserva no
     * se mueve.
     */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: reservationStatus("status").notNull().default("HELD"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    // Sumar lo retenido de un producto: la invariante de `reserved`.
    index("stock_reservations_product_id_status_idx").on(t.productId, t.status),
    // El barrido del cron entra por aquí: las vivas que ya vencieron.
    index("stock_reservations_status_expires_at_idx").on(t.status, t.expiresAt),
    // Las reservas de una parte, para consumirlas o soltarlas de una vez.
    index("stock_reservations_order_supplier_id_idx").on(t.orderSupplierId),
  ],
);

/**
 * La reposición que el proveedor anuncia. **No toca el saldo.**
 *
 * Vive aparte de `stock_movements` a propósito: el stock actual es un hecho
 * verificable y transaccional, y esto es una intención con fecha borrosa.
 * Juntos, cada lectura de "¿puedo vender esto?" tendría que filtrar por fecha y
 * un proveedor optimista contaminaría lo vendible.
 *
 * La incertidumbre es **estructural**: no lleva fecha, lleva ventana. Estrecha
 * significa "seguro", ancha "creo que sí", y la UI no puede renderizarla como
 * promesa aunque quiera. Al llegar, la fila pasa a `ARRIVED` **y** se escribe un
 * `RESTOCK` con la cantidad real: dos hechos distintos, y la distancia entre
 * ellos dice qué proveedor cumple lo que anuncia.
 */
export const restocks = pgTable(
  "restocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Lo estimado. Lo que de verdad llegue va en el movimiento `RESTOCK`. */
    quantity: integer("quantity").notNull(),
    // Sin hora: la promesa es de días. `date` no lleva zona, que es justo lo que
    // se quiere — "el 12" es el 12 para todo el mundo.
    etaFrom: date("eta_from", { mode: "string" }).notNull(),
    etaTo: date("eta_to", { mode: "string" }).notNull(),
    status: restockStatus("status").notNull().default("ANNOUNCED"),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    // Lo que el catálogo pregunta: las anunciadas de este producto. La ventana
    // la filtra la propia consulta (`eta_to >= today`), así que un anuncio
    // olvidado desaparece solo sin que nadie vaya a limpiarlo.
    index("restocks_product_id_status_idx").on(t.productId, t.status),
    // Por donde entra el cron a caducar las que se pasaron de ventana.
    index("restocks_status_eta_to_idx").on(t.status, t.etaTo),
  ],
);

/**
 * "Avísame cuando vuelva".
 *
 * Es lo que se ofrece en lugar de la pre-orden, que queda fuera de la Fase 1:
 * con pago manual, vender lo que no ha llegado sería cobrar por adelantado
 * contra una fecha que nosotros mismos presentamos como aproximada. Esto captura
 * la demanda sin tocar dinero — y de paso le dice al proveedor cuánto pedir.
 */
export const stockAlerts = pgTable(
  "stock_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
  },
  (t) => [
    // Apuntarse dos veces al mismo producto no significa nada.
    unique("stock_alerts_product_id_user_id_key").on(t.productId, t.userId),
    // A quién avisar cuando entra un `RESTOCK`: los que aún no saben.
    index("stock_alerts_product_id_notified_at_idx").on(t.productId, t.notifiedAt),
  ],
);

/**
 * El precio como línea de tiempo, para productos, kits y servicios.
 *
 * Es la **verdad**: las filas pasadas son el histórico, las futuras el precio
 * programado, y el efectivo es el de mayor `starts_at <= now()`. La columna
 * `price_usd` de cada tabla es una caché de ese efectivo — ver el comentario en
 * `products.priceUsd`.
 *
 * `targetId` es una FK "blanda" a `products.id`, `kits.id` o `services.id` según
 * `targetType`, igual que `order_items.itemId` e `installation_offers.targetId`.
 */
export const priceSchedules = pgTable(
  "price_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: priceableType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    priceUsd: numeric("price_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
    /** Desde cuándo rige. En el futuro = anunciado; en el pasado = histórico. */
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // "El precio efectivo de este item": se entra por el par y se toma la fila
    // de mayor `starts_at` que ya haya empezado, así que el índice tiene que
    // llevar las tres columnas y en este orden.
    index("price_schedules_target_starts_at_idx").on(
      t.targetType,
      t.targetId,
      t.startsAt,
    ),
  ],
);

// ─── Relaciones (para db.query con joins tipados) ───────────────────────────

export const zonesRelations = relations(zones, ({ one, many }) => ({
  parent: one(zones, { fields: [zones.parentId], references: [zones.id], relationName: "zoneParent" }),
  children: many(zones, { relationName: "zoneParent" }),
  supplierZones: many(supplierZones),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  zone: one(zones, { fields: [users.zoneId], references: [zones.id] }),
  orders: many(orders),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  zones: many(supplierZones),
  products: many(products),
  kits: many(kits),
  services: many(services),
  // No `orders`: un pedido ya no es de un proveedor. Lo suyo son las partes.
  orderParts: many(orderSuppliers),
}));

export const supplierZonesRelations = relations(supplierZones, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierZones.supplierId], references: [suppliers.id] }),
  zone: one(zones, { fields: [supplierZones.zoneId], references: [zones.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  kitItems: many(kitItems),
  movements: many(stockMovements),
  reservations: many(stockReservations),
  restocks: many(restocks),
  alerts: many(stockAlerts),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  actor: one(users, { fields: [stockMovements.actorUserId], references: [users.id] }),
  onBehalfOf: one(suppliers, {
    fields: [stockMovements.onBehalfOfSupplierId],
    references: [suppliers.id],
  }),
}));

export const stockReservationsRelations = relations(stockReservations, ({ one }) => ({
  product: one(products, {
    fields: [stockReservations.productId],
    references: [products.id],
  }),
  part: one(orderSuppliers, {
    fields: [stockReservations.orderSupplierId],
    references: [orderSuppliers.id],
  }),
}));

export const restocksRelations = relations(restocks, ({ one }) => ({
  product: one(products, { fields: [restocks.productId], references: [products.id] }),
}));

export const stockAlertsRelations = relations(stockAlerts, ({ one }) => ({
  product: one(products, { fields: [stockAlerts.productId], references: [products.id] }),
  user: one(users, { fields: [stockAlerts.userId], references: [users.id] }),
}));

// `price_schedules` no lleva relación: `targetId` apunta a tres tablas según
// `targetType`, y eso drizzle no lo puede tipar — igual que `installationOffers`.

export const kitsRelations = relations(kits, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [kits.supplierId], references: [suppliers.id] }),
  items: many(kitItems),
}));

export const kitItemsRelations = relations(kitItems, ({ one }) => ({
  kit: one(kits, { fields: [kitItems.kitId], references: [kits.id] }),
  product: one(products, { fields: [kitItems.productId], references: [products.id] }),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [services.supplierId], references: [suppliers.id] }),
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  offers: many(installationOffers),
}));

// Solo el lado del servicio: `targetId` es una FK blanda (apunta a dos tablas
// según `targetType`), y eso drizzle no lo puede tipar como relación.
export const installationOffersRelations = relations(installationOffers, ({ one }) => ({
  service: one(services, { fields: [installationOffers.serviceId], references: [services.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  zone: one(zones, { fields: [orders.zoneId], references: [zones.id] }),
  // Las líneas no cuelgan del pedido: se llega a ellas por su parte.
  parts: many(orderSuppliers),
  payments: many(payments),
}));

export const orderSuppliersRelations = relations(orderSuppliers, ({ one, many }) => ({
  order: one(orders, { fields: [orderSuppliers.orderId], references: [orders.id] }),
  supplier: one(suppliers, {
    fields: [orderSuppliers.supplierId],
    references: [suppliers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  part: one(orderSuppliers, {
    fields: [orderItems.orderSupplierId],
    references: [orderSuppliers.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
