CREATE INDEX "kit_items_product_id_idx" ON "kit_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "kits_supplier_id_active_idx" ON "kits" USING btree ("supplier_id","active");--> statement-breakpoint
CREATE INDEX "kits_price_usd_idx" ON "kits" USING btree ("price_usd");--> statement-breakpoint
CREATE INDEX "products_supplier_id_active_idx" ON "products" USING btree ("supplier_id","active");--> statement-breakpoint
CREATE INDEX "products_price_usd_idx" ON "products" USING btree ("price_usd");--> statement-breakpoint
CREATE INDEX "supplier_zones_zone_id_idx" ON "supplier_zones" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "zones_parent_id_idx" ON "zones" USING btree ("parent_id");