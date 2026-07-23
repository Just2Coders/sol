import { relations } from "drizzle-orm";
import {
  boolean,
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

export const orderItemType = pgEnum("order_item_type", ["PRODUCT", "KIT"]);

// ─── Zonas ───────────────────────────────────────────────────────────────────
// Jerarquía simple: estado (parentId null) → ciudad/municipio (parentId = estado).

export const zones = pgTable("zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: uuid("parent_id").references((): AnyPgColumn => zones.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  (t) => [primaryKey({ columns: [t.supplierId, t.zoneId] })],
);

// ─── Productos y kits ────────────────────────────────────────────────────────

export const products = pgTable("products", {
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
});

export const kits = pgTable("kits", {
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
});

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
  (t) => [primaryKey({ columns: [t.kitId, t.productId] })],
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
  // FK "blanda": apunta a products.id o kits.id según itemType.
  itemId: uuid("item_id").notNull(),
  // Snapshot al momento de la compra: cambios de precio/nombre posteriores
  // no alteran órdenes existentes.
  nameSnapshot: text("name_snapshot").notNull(),
  priceSnapshotUsd: numeric("price_snapshot_usd", {
    precision: 10,
    scale: 2,
    mode: "number",
  }).notNull(),
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
