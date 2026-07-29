"use client";

import { useActionState } from "react";
import { deleteSupplier } from "@/app/actions/suppliers";
import { Button } from "@/components/ui/button";

export function SupplierDeleteButton({
  supplierId,
  supplierName,
}: {
  supplierId: string;
  supplierName: string;
}) {
  const [state, action, pending] = useActionState(deleteSupplier, undefined);

  return (
    <form
      action={action}
      className="grid justify-items-end gap-2"
      onSubmit={(e) => {
        if (
          !confirm(
            `¿Eliminar "${supplierName}"? Se borrarán también sus productos, kits y cobertura. Esta acción no se puede deshacer.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={supplierId} />
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Eliminando..." : "Eliminar proveedor"}
      </Button>
    </form>
  );
}
