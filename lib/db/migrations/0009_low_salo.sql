ALTER TYPE "public"."fulfillment_status" ADD VALUE 'CONFIRMED' BEFORE 'DELIVERED';--> statement-breakpoint
ALTER TYPE "public"."fulfillment_status" ADD VALUE 'DECLINED' BEFORE 'CANCELLED';--> statement-breakpoint
ALTER TYPE "public"."fulfillment_status" ADD VALUE 'EXPIRED' BEFORE 'CANCELLED';--> statement-breakpoint
ALTER TABLE "order_suppliers" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_suppliers" ADD COLUMN "decline_reason" text;--> statement-breakpoint
ALTER TABLE "order_suppliers" ADD COLUMN "decided_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "order_suppliers" ADD CONSTRAINT "order_suppliers_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_suppliers_status_confirmation_due_at_idx" ON "order_suppliers" USING btree ("status","confirmation_due_at");