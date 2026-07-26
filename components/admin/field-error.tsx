import type { ActionState } from "@/lib/forms";

/** Primer error de validación de un campo, si lo hay. */
export function FieldError({
  state,
  field,
}: {
  state: ActionState;
  field: string;
}) {
  const error = state?.errors?.[field]?.[0];
  return error ? <p className="text-sm text-destructive">{error}</p> : null;
}
