"use client";

import { useActionState, useRef } from "react";
import { createServiceCategory } from "@/app/actions/service-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Alta de categoría. No pide el orden: nace al final (`position` = el siguiente)
 * y se recoloca editándola, que es cuando se ve la lista entera y se puede
 * decidir dónde va.
 */
export function ServiceCategoryCreateForm({ nextPosition }: { nextPosition: number }) {
  const formRef = useRef<HTMLFormElement>(null);

  // Envuelve la action para vaciar los campos cuando el alta va bien: si no, el
  // nombre recién creado se queda escrito y parece que no pasó nada.
  const [state, action, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof createServiceCategory>>, formData: FormData) => {
      const result = await createServiceCategory(prev, formData);
      if (result?.success) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <form ref={formRef} action={action} className="grid gap-2">
      <input type="hidden" name="position" value={nextPosition} />
      <div className="flex flex-wrap gap-2">
        <Input
          name="name"
          placeholder="Nombre (ej. Mantenimiento)"
          required
          className="h-8 w-56"
          aria-label="Nombre de la categoría"
        />
        <Input
          name="description"
          placeholder="Descripción (opcional)"
          className="h-8 min-w-48 flex-1"
          aria-label="Descripción"
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Agregando..." : "Agregar"}
        </Button>
      </div>
      {(state?.errors?.name || state?.message) && (
        <p className="text-sm text-destructive">
          {state.errors?.name?.[0] ?? state.message}
        </p>
      )}
    </form>
  );
}
