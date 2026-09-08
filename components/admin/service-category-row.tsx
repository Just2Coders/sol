"use client";

import { useActionState, useState } from "react";
import { Check, Edit2, Trash2, X } from "reicon-react";
import {
  deleteServiceCategory,
  updateServiceCategory,
  type ServiceCategoryFormState,
} from "@/app/actions/service-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";

export type ServiceCategoryRowData = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  serviceCount: number;
};

/**
 * Una categoría, con edición en línea.
 *
 * Es el mismo trato que una zona (`zone-item.tsx`) y por el mismo motivo: son
 * pocos campos y se ajustan de a poco —sobre todo el orden, que solo se entiende
 * mirando la lista entera—, así que mandar a otra página a cambiar un número
 * sería perder el contexto que hace falta para elegirlo.
 */
export function ServiceCategoryRow({ category }: { category: ServiceCategoryRowData }) {
  const [editing, setEditing] = useState(false);

  // Envuelve la action para cerrar el modo edición cuando el guardado va bien.
  const [updateState, updateAction, updating] = useActionState(
    async (prev: ServiceCategoryFormState, formData: FormData) => {
      const result = await updateServiceCategory(prev, formData);
      if (result?.success) setEditing(false);
      return result;
    },
    undefined,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteServiceCategory,
    undefined,
  );

  const error =
    updateState?.errors?.name?.[0] ??
    updateState?.errors?.position?.[0] ??
    updateState?.message ??
    deleteState?.message;

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={4}>
          <form action={updateAction} className="grid gap-2">
            <input type="hidden" name="id" value={category.id} />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                name="name"
                defaultValue={category.name}
                required
                autoFocus
                className="h-8 w-48"
                aria-label="Nombre"
              />
              <Input
                name="position"
                inputMode="numeric"
                defaultValue={category.position}
                required
                className="h-8 w-20"
                aria-label="Orden"
              />
              <Input
                name="description"
                defaultValue={category.description ?? ""}
                placeholder="Descripción (opcional)"
                className="h-8 min-w-48 flex-1"
                aria-label="Descripción"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={updating}
                title="Guardar"
              >
                <Check aria-hidden className="size-4" />
                <span className="sr-only">Guardar {category.name}</span>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Cancelar"
                onClick={() => setEditing(false)}
              >
                <X aria-hidden className="size-4" />
                <span className="sr-only">Cancelar</span>
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="group">
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {category.position}
      </TableCell>
      <TableCell>
        <span className="font-medium">{category.name}</span>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {category.description ?? "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <span className="mr-2 text-sm text-muted-foreground tabular-nums">
            {category.serviceCount === 0
              ? "sin servicios"
              : `${category.serviceCount} servicio${category.serviceCount === 1 ? "" : "s"}`}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Editar"
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => setEditing(true)}
          >
            <Edit2 aria-hidden className="size-4" />
            <span className="sr-only">Editar {category.name}</span>
          </Button>
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm(`¿Eliminar "${category.name}"?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={category.id} />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              title="Eliminar"
              disabled={deleting}
              className="text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 aria-hidden className="size-4" />
              <span className="sr-only">Eliminar {category.name}</span>
            </Button>
          </form>
        </div>
      </TableCell>
    </TableRow>
  );
}
