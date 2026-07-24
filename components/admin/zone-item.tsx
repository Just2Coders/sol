"use client";

import { useActionState, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { deleteZone, updateZone, type ZoneFormState } from "@/app/actions/zones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Fila de zona (estado o ciudad) con renombrar inline y eliminar.
export function ZoneItem({
  zone,
  className,
}: {
  zone: { id: string; name: string };
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  // Envuelve la action para cerrar el modo edición cuando el guardado va bien.
  const [updateState, updateAction, updating] = useActionState(
    async (prev: ZoneFormState, formData: FormData) => {
      const result = await updateZone(prev, formData);
      if (result?.success) setEditing(false);
      return result;
    },
    undefined,
  );
  const [deleteState, deleteAction, deleting] = useActionState(deleteZone, undefined);

  if (editing) {
    return (
      <div className={cn("grid gap-1", className)}>
        <form action={updateAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={zone.id} />
          <Input name="name" defaultValue={zone.name} required autoFocus className="h-8" />
          <Button type="submit" size="icon" variant="ghost" disabled={updating} title="Guardar">
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Cancelar"
            onClick={() => setEditing(false)}
          >
            <X className="size-4" />
          </Button>
        </form>
        {(updateState?.errors?.name || updateState?.message) && (
          <p className="text-sm text-destructive">
            {updateState.errors?.name?.[0] ?? updateState.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-1", className)}>
      <div className="group flex items-center gap-1">
        <span className="mr-auto">{zone.name}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Renombrar"
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </Button>
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm(`¿Eliminar "${zone.name}"?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={zone.id} />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            title="Eliminar"
            disabled={deleting}
            className="text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 className="size-4" />
          </Button>
        </form>
      </div>
      {deleteState?.message && (
        <p className="text-sm text-destructive">{deleteState.message}</p>
      )}
    </div>
  );
}
