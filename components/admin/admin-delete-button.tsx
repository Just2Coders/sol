"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/forms";

/**
 * Botón de borrado reutilizable para las entidades del admin.
 *
 * Recibe la Server Action como prop: la verificación de permisos vive dentro de
 * la Action, no aquí (el cliente nunca es la última defensa).
 */
export function AdminDeleteButton({
  action,
  id,
  confirmMessage,
  label,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  confirmMessage: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="grid justify-items-end gap-2"
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Eliminando..." : label}
      </Button>
    </form>
  );
}
