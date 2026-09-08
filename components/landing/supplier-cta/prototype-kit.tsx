"use client";

import { useState, type FormEvent } from "react";

/**
 * Piezas compartidas por los dos prototipos que quedan en la sección de
 * proveedores de la home (`supplier-cta-ledger.tsx`, `gap-lead-form.tsx`).
 *
 * PROTOTIPO — el envío es falso: no hay Server Action ni tabla detrás. El
 * formulario real de `/sell` ya no usa este hook — ver
 * `app/actions/supplier-leads.ts` y `SupplierApplicationForm`, que persisten
 * de verdad con `useActionState`. Este archivo se queda solo para que las
 * otras dos exploraciones, que no han salido de `/design`, sigan compilando.
 */

/** Re-exportada desde `lib/zones/provinces` — ver esa nota para el porqué. */
export { PROVINCES } from "@/lib/zones/provinces";

export type LeadStatus = "idle" | "sending" | "sent";

/** Lo que el proveedor acaba de escribir, para que el acuse lo repita. */
export type LeadDraft = {
  business: string;
  province: string;
};

/**
 * Simula el ciclo de envío de la solicitud. El retardo existe para poder ver
 * el estado "enviando" del botón, que en producción lo dará `pending`.
 */
export function useLeadPrototype() {
  const [status, setStatus] = useState<LeadStatus>("idle");
  const [draft, setDraft] = useState<LeadDraft>({ business: "", province: "" });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDraft({
      business: String(data.get("business") ?? "").trim(),
      province: String(data.get("province") ?? "").trim(),
    });
    setStatus("sending");
    window.setTimeout(() => setStatus("sent"), 700);
  }

  return { status, draft, onSubmit };
}
