import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
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
    priceUsd: numeric("price_usd", { precision: 10, scale: 2, mode: "number" }).notNull(),
    stock: integer("stock").notNull().default(0),
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
// Regla de negocio: una orden pertenece a UN solo proveedor (simplifica la
// liquidación manual). El carrito no permite mezclar proveedores.

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Número corto legible para el cliente y como referencia del Zelle (SOL-1042).
  orderNumber: text("order_number").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliers.id),
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

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
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
});

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
  orders: many(orders),
}));

export const supplierZonesRelations = relations(supplierZones, ({ one }) => ({
  supplier: one(suppliers, { fields: [supplierZones.supplierId], references: [suppliers.id] }),
  zone: one(zones, { fields: [supplierZones.zoneId], references: [zones.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  kitItems: many(kitItems),
}));

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
  supplier: one(suppliers, { fields: [orders.supplierId], references: [suppliers.id] }),
  zone: one(zones, { fields: [orders.zoneId], references: [zones.id] }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
