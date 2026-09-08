"use client";

import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart/lines";
import { useCartItemState, useCartStore } from "@/lib/cart/store";

/**
 * El botón de compra de una ficha: lo que se lleva el visitante, a tamaño
 * grande. Lo que enseña sale de `useCartItemState`, que es también quien
 * alimenta al botón pequeño de la instalación.
 */
export function AddToCartButton({ item }: { item: CartItem }) {
  const add = useCartStore((state) => state.add);
  const setOpen = useCartStore((state) => state.setOpen);
  const { inCart, soldOut, complete } = useCartItemState(item);

  return (
    <div>
      <Button
        size="lg"
        className="w-full"
        disabled={soldOut || complete}
        onClick={() => add(item)}
      >
        {soldOut
          ? "Sin stock"
          : inCart > 0
            ? "Añadir otro"
            : "Añadir al carrito"}
      </Button>

      {/* Ya en el carrito: el número es también la puerta al panel, que es
          donde se cambia la cantidad y se ve el subtotal. */}
      {inCart > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground text-marginalia ease-standard mt-3 font-mono underline underline-offset-4 transition-colors duration-base"
        >
          en el carrito · {inCart}
          {complete && " · sin más stock"}
        </button>
      )}
    </div>
  );
}
