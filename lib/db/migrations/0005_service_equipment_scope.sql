CREATE TYPE "public"."equipment_scope" AS ENUM('OWN', 'PLATFORM', 'ANY');--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "equipment_scope" "equipment_scope" DEFAULT 'OWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "default_equipment_scope" "equipment_scope" DEFAULT 'OWN' NOT NULL;