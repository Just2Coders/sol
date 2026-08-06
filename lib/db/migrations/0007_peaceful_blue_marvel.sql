CREATE TYPE "public"."priceable_type" AS ENUM('PRODUCT', 'KIT', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('HELD', 'CONSUMED', 'RELEASED');--> statement-breakpoint
CREATE TYPE "public"."restock_status" AS ENUM('ANNOUNCED', 'ARRIVED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_reason" AS ENUM('OPENING', 'RESTOCK', 'SALE', 'RELEASE', 'ADJUSTMENT', 'LOSS', 'RETURN');--> statement-breakpoint
CREATE TABLE "price_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "priceable_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"eta_from" date NOT NULL,
	"eta_to" date NOT NULL,
	"status" "restock_status" DEFAULT 'ANNOUNCED' NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	CONSTRAINT "stock_alerts_product_id_user_id_key" UNIQUE("product_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" "stock_movement_reason" NOT NULL,
	"order_supplier_id" uuid,
	"note" text,
	"actor_user_id" uuid,
	"on_behalf_of_supplier_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_supplier_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'HELD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reserved" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "reservation_hold_hours" integer;--> statement-breakpoint
ALTER TABLE "price_schedules" ADD CONSTRAINT "price_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restocks" ADD CONSTRAINT "restocks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restocks" ADD CONSTRAINT "restocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_supplier_id_order_suppliers_id_fk" FOREIGN KEY ("order_supplier_id") REFERENCES "public"."order_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_on_behalf_of_supplier_id_suppliers_id_fk" FOREIGN KEY ("on_behalf_of_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_supplier_id_order_suppliers_id_fk" FOREIGN KEY ("order_supplier_id") REFERENCES "public"."order_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_schedules_target_starts_at_idx" ON "price_schedules" USING btree ("target_type","target_id","starts_at");--> statement-breakpoint
CREATE INDEX "restocks_product_id_status_idx" ON "restocks" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "restocks_status_eta_to_idx" ON "restocks" USING btree ("status","eta_to");--> statement-breakpoint
CREATE INDEX "stock_alerts_product_id_notified_at_idx" ON "stock_alerts" USING btree ("product_id","notified_at");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_occurred_at_idx" ON "stock_movements" USING btree ("product_id","occurred_at");--> statement-breakpoint
CREATE INDEX "stock_reservations_product_id_status_idx" ON "stock_reservations" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "stock_reservations_status_expires_at_idx" ON "stock_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "stock_reservations_order_supplier_id_idx" ON "stock_reservations" USING btree ("order_supplier_id");--> statement-breakpoint
-- ─── Backfill ────────────────────────────────────────────────────────────────
-- Escrito a mano: drizzle-kit genera la forma, no los datos.
--
-- No es opcional. Las dos tablas nuevas son la fuente de verdad de algo que ya
-- existía —el saldo y el precio—, así que nacen mintiendo si no se les cuenta lo
-- que ya había. Con esto, las dos invariantes se cumplen desde el primer minuto
-- y se pueden comprobar con una query:
--
--   products.stock  = coalesce(sum(stock_movements.delta), 0)   por producto
--   products.price_usd = el price_schedules de mayor starts_at <= now()
--
-- A diferencia de la 0003, aquí `products` NO está vacía, así que esto se
-- ejecuta sobre datos reales. Los `NOT EXISTS` lo hacen repetible sin duplicar.

-- El saldo de apertura del libro mayor. Se escribe para **todos** los productos,
-- incluidos los que están a cero: "el día que abrió el libro había 0" es un
-- hecho, y deja el histórico uniforme en vez de con huecos.
INSERT INTO "stock_movements" ("product_id", "delta", "reason", "note")
SELECT p."id", p."stock", 'OPENING'::"public"."stock_movement_reason",
       'Saldo de apertura al crear el libro mayor'
FROM "products" p
WHERE NOT EXISTS (
  SELECT 1 FROM "stock_movements" m
  WHERE m."product_id" = p."id" AND m."reason" = 'OPENING'
);--> statement-breakpoint

-- El precio que rige hoy, fechado en el nacimiento del item y no en el de esta
-- migración: así la línea de tiempo cubre toda la vida del producto sin dejar un
-- hueco en el que "no había precio". Es aproximado —nadie guardó cuándo cambió
-- por última vez— pero es lo más cierto que se puede decir con lo que hay.
INSERT INTO "price_schedules" ("target_type", "target_id", "price_usd", "starts_at", "note")
SELECT 'PRODUCT'::"public"."priceable_type", p."id", p."price_usd", p."created_at",
       'Precio vigente al crear la línea de tiempo'
FROM "products" p
WHERE NOT EXISTS (
  SELECT 1 FROM "price_schedules" s
  WHERE s."target_type" = 'PRODUCT' AND s."target_id" = p."id"
);--> statement-breakpoint

INSERT INTO "price_schedules" ("target_type", "target_id", "price_usd", "starts_at", "note")
SELECT 'KIT'::"public"."priceable_type", k."id", k."price_usd", k."created_at",
       'Precio vigente al crear la línea de tiempo'
FROM "kits" k
WHERE NOT EXISTS (
  SELECT 1 FROM "price_schedules" s
  WHERE s."target_type" = 'KIT' AND s."target_id" = k."id"
);--> statement-breakpoint

INSERT INTO "price_schedules" ("target_type", "target_id", "price_usd", "starts_at", "note")
SELECT 'SERVICE'::"public"."priceable_type", sv."id", sv."price_usd", sv."created_at",
       'Precio vigente al crear la línea de tiempo'
FROM "services" sv
WHERE NOT EXISTS (
  SELECT 1 FROM "price_schedules" s
  WHERE s."target_type" = 'SERVICE' AND s."target_id" = sv."id"
);