CREATE TYPE "public"."installable_type" AS ENUM('PRODUCT', 'KIT');--> statement-breakpoint
CREATE TYPE "public"."service_pricing" AS ENUM('FLAT', 'PER_UNIT');--> statement-breakpoint
ALTER TYPE "public"."order_item_type" ADD VALUE 'SERVICE';--> statement-breakpoint
CREATE TABLE "installation_offers" (
	"service_id" uuid NOT NULL,
	"target_type" "installable_type" NOT NULL,
	"target_id" uuid NOT NULL,
	CONSTRAINT "installation_offers_service_id_target_type_target_id_pk" PRIMARY KEY("service_id","target_type","target_id")
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"pricing" "service_pricing" DEFAULT 'FLAT' NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"unit_label" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "installation_offers" ADD CONSTRAINT "installation_offers_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "installation_offers_target_idx" ON "installation_offers" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "services_supplier_id_active_idx" ON "services" USING btree ("supplier_id","active");--> statement-breakpoint
CREATE INDEX "services_price_usd_idx" ON "services" USING btree ("price_usd");--> statement-breakpoint
CREATE INDEX "services_category_id_idx" ON "services" USING btree ("category_id");