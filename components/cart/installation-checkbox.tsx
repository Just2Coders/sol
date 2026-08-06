"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cartLineKey, type CartItem } from "@/lib/cart/lines";
import { useCartItemState, useCartStore } from "@/lib/cart/store";

/**
 * Añadir o quitar una instalación desde la ficha del equipo que instala.
 *
 * Es booleano y no un contador: la instalación se contrata o no se contrata,
 * no se pide "otra". Marcar añade una unidad; desmarcar quita la línea entera,
 * sea cual sea la cantidad que tuviera — ajustarla fino es cosa del panel del
 * carrito, no de esta ficha.
 */
export function InstallationCheckbox({ item }: { item: CartItem }) {
  const add = useCartStore((state) => state.add);
  const remove = useCartStore((state) => state.remove);
  const { inCart } = useCartItemState(item);
  const checked = inCart > 0;

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => {
        if (value) add(item);
        else remove(cartLineKey(item));
      }}
      aria-label={`Añadir instalación: ${item.name}`}
    />
  );
}
