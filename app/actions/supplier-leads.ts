"use server";

import * as z from "zod";

import { db } from "@/lib/db";
import { supplierLeads } from "@/lib/db/schema";
import { PROVINCES } from "@/lib/zones/provinces";

export type SupplierLeadState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
      business?: string;
      province?: string;
    }
  | undefined;

const leadSchema = z.object({
  business: z.string().trim().min(2, { error: "El nombre es muy corto." }),
  province: z.enum(PROVINCES, { error: "Elige una provincia." }),
  contact: z
    .string()
    .trim()
    .min(5, { error: "Deja un WhatsApp o un correo donde escribirte." }),
});

/**
 * Guarda la solicitud de alta de `/sell`. Público — no hay `verifyAdmin`
 * aquí: cualquiera puede pedir vender en Solaris. El equipo revisa las
 * filas de `supplier_leads` a mano y las convierte en `suppliers` — ese
 * paso no tiene panel todavía.
 */
export async function createSupplierLead(
  _state: SupplierLeadState,
  formData: FormData,
): Promise<SupplierLeadState> {
  const parsed = leadSchema.safeParse({
    business: formData.get("business"),
    province: formData.get("province"),
    contact: formData.get("contact"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  await db.insert(supplierLeads).values(parsed.data);

  return {
    success: true,
    business: parsed.data.business,
    province: parsed.data.province,
  };
}
