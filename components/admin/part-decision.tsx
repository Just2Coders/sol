"use client";

import { useActionState, useState } from "react";
import { decideOrderPart } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * El sí y el no de una parte, en la pantalla del admin.
 *
 * El no está **detrás de un paso más** y no al lado del sí, a propósito: rechazar
 * suelta el stock, puede cancelar el pedido entero y le cambia el total al
 * comprador, así que no puede costar el mismo clic que aceptar. Al abrirlo pide
 * el motivo, que es lo que el comprador acabará leyendo.
 *
 * Cliente por el motivo y por nada más: sin ese campo esto serían dos formularios
 * de servidor con un botón cada uno.
 */
export function PartDecision({
  partId,
  supplierName,
}: {
  partId: string;
  supplierName: string;
}) {
  const [state, action, pending] = useActionState(decideOrderPart, undefined);
  const [declining, setDeclining] = useState(false);

  return (
    <div className="grid gap-3">
      {!declining ? (
        <div className="flex flex-wrap items-center gap-2">
          <form action={action}>
            <input type="hidden" name="partId" value={partId} />
            <input type="hidden" name="decision" value="CONFIRM" />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : `${supplierName} lo confirma`}
            </Button>
          </form>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setDeclining(true)}
          >
            No puede atenderlo
          </Button>
        </div>
      ) : (
        <form action={action} className="grid gap-2">
          <input type="hidden" name="partId" value={partId} />
          <input type="hidden" name="decision" value="DECLINE" />
          <Textarea
            name="reason"
            required
            maxLength={300}
            rows={2}
            placeholder="Por qué no puede atenderlo. Lo va a leer el comprador."
            aria-label="Motivo del rechazo"
          />
          {state?.errors?.reason && (
            <p className="text-destructive text-sm">{state.errors.reason[0]}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="destructive" disabled={pending}>
              {pending ? "Guardando…" : "Rechazar esta parte"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setDeclining(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* El caso que se olvida: el cron pudo vencerla mientras la pantalla
          estaba abierta, y entonces el botón no falla por un bug. */}
      {state?.message && <p className="text-warning text-sm">{state.message}</p>}
    </div>
  );
}
