CREATE TYPE "public"."fulfillment_status" AS ENUM('PENDING', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "order_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"subtotal_usd" numeric(10, 2) NOT NULL,
	"status" "fulfillment_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_suppliers_order_id_supplier_id_key" UNIQUE("order_id","supplier_id")
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_supplier_id_suppliers_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "order_supplier_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "order_suppliers" ADD CONSTRAINT "order_suppliers_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_suppliers" ADD CONSTRAINT "order_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_suppliers_supplier_id_idx" ON "order_suppliers" USING btree ("supplier_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_supplier_id_order_suppliers_id_fk" FOREIGN KEY ("order_supplier_id") REFERENCES "public"."order_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_supplier_id_idx" ON "order_items" USING btree ("order_supplier_id");--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "supplier_id";