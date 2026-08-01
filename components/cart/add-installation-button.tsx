"use client";

import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart/lines";
import { useCartItemState, useCartStore } from "@/lib/cart/store";

/**
 * Añadir una instalación desde la ficha del equipo que instala.
 *
 * Es el hermano pequeño de `AddToCartButton`: la misma lectura del carrito, en
 * secundario, porque la instalación acompaña a la compra y no compite con ella.
 * No repite el aviso de "tu carrito es de otro proveedor" —la instalación es del
 * mismo proveedor que el equipo, así que el botón de arriba ya lo ha explicado—;
 * aquí solo se desactiva.
 *
 * En un servicio por unidad de obra la cantidad son unidades, no piezas, así que
 * se cuenta con "×4" y no se intenta pluralizar la unidad.
 */
export function AddInstallationButton({ item }: { item: CartItem }) {
  const add = useCartStore((state) => state.add);
  const setOpen = useCartStore((state) => state.setOpen);
  const { inCart, conflict } = useCartItemState(item);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button
        variant="outline"
        size="sm"
        disabled={conflict !== null}
        onClick={() => add(item)}
      >
        {inCart > 0 ? "Añadir otra" : "Añadir instalación"}
      </Button>

      {inCart > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground text-marginalia ease-standard font-mono underline underline-offset-4 transition-colors duration-base"
        >
          en el carrito · ×{inCart}
        </button>
      )}
    </div>
  );
}
