import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplierLeads } from "@/lib/db/schema";

export type SupplierLead = typeof supplierLeads.$inferSelect;

/**
 * Las solicitudes de alta que dejó `/sell`, la más reciente primero.
 *
 * El orden no es un detalle: una solicitud vale mientras quien la dejó todavía
 * se acuerde de haberla dejado, así que lo primero que hay que ver es lo último
 * que entró.
 *
 * No hay paginación todavía. Cuando la lista deje de caber en una pantalla hará
 * falta, y probablemente antes hará falta poder marcar una como atendida — ver
 * la nota de `app/admin/supplier-leads/page.tsx`.
 */
export async function getSupplierLeads(): Promise<SupplierLead[]> {
  return db.query.supplierLeads.findMany({
    orderBy: [desc(supplierLeads.createdAt)],
  });
}
