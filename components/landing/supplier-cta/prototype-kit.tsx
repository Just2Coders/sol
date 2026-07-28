"use client";

import { useState, type FormEvent } from "react";

/**
 * Piezas compartidas por los tres prototipos de la sección de proveedores.
 *
 * PROTOTIPO — el envío es falso: no hay Server Action ni tabla detrás. Cuando
 * se elija variante, el `<form onSubmit>` se sustituye por `useActionState` +
 * una Action en `app/actions/` que valide con Zod y guarde el lead, igual que
 * el resto de mutaciones del proyecto. El estado de aquí (idle · sending ·
 * sent) es el mismo que expondrá esa Action, así que el markup no cambia.
 */

/**
 * Las 16 provincias, en el mismo orden oeste→este del mapa.
 *
 * PROTOTIPO — en la versión real llegan por props desde el servidor
 * (`getZoneOptions()`), que es la fuente de verdad de las zonas.
 */
export const PROVINCES = [
  "Pinar del Río",
  "Artemisa",
  "La Habana",
  "Mayabeque",
  "Matanzas",
  "Cienfuegos",
  "Villa Clara",
  "Sancti Spíritus",
  "Ciego de Ávila",
  "Camagüey",
  "Las Tunas",
  "Holguín",
  "Granma",
  "Santiago de Cuba",
  "Guantánamo",
  "Isla de la Juventud",
] as const;

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
