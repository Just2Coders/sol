"use client";

import { useActionState } from "react";
import { createZone } from "@/app/actions/zones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Crea un estado (sin parentId) o una ciudad (con parentId).
export function ZoneCreateForm({
  parentId,
  placeholder,
}: {
  parentId?: string;
  placeholder: string;
}) {
  const [state, action, pending] = useActionState(createZone, undefined);

  return (
    <form action={action} className="grid gap-1">
      <div className="flex gap-2">
        {parentId && <input type="hidden" name="parentId" value={parentId} />}
        <Input name="name" placeholder={placeholder} required className="h-8" />
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
