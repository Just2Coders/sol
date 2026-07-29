"use client";

import { Button } from "@/components/ui/button";
import { cartLineKey, cartSupplier, type CartItem } from "@/lib/cart/lines";
import { useCartLines, useCartStore } from "@/lib/cart/store";

/**
 * El botón de compra de una ficha.
 *
 * Todo lo que enseña es **derivado** del carrito, no de un estado propio: si el
 * visitante vacía el carrito desde el panel, este botón se destraba solo. Antes
 * de que `localStorage` esté leído el carrito se ve vacío, así que el botón
 * nace exactamente igual en el HTML del servidor y en la primera pintada del
 * cliente.
 */
export function AddToCartButton({ item }: { item: CartItem }) {
  const add = useCartStore((state) => state.add);
  const clear = useCartStore((state) => state.clear);
  const setOpen = useCartStore((state) => state.setOpen);
  const lines = useCartLines();

  const key = cartLineKey(item);
  const inCart = lines.find((line) => cartLineKey(line) === key)?.quantity ?? 0;

  // Una orden se entrega por un solo proveedor (ver PLAN.md), así que un
  // carrito ya empezado con otro cierra la puerta hasta que se vacíe.
  const supplier = cartSupplier(lines);
  const conflict =
    supplier && supplier.slug !== item.supplierSlug ? supplier : null;

  const soldOut = item.stock === 0;
  const complete = item.stock !== null && inCart >= item.stock;

  return (
    <div>
      <Button
        size="lg"
        className="w-full"
        disabled={soldOut || complete || conflict !== null}
        onClick={() => add(item)}
      >
        {soldOut
          ? "Sin stock"
          : inCart > 0
            ? "Añadir otro"
            : "Añadir al carrito"}
      </Button>

      {conflict && (
        <p className="text-warning text-body-sm mt-3">
          Tu carrito es de {conflict.name}. Cada pedido lo entrega un solo
          proveedor, así que hay que{" "}
          <button
            type="button"
            onClick={clear}
            className="underline underline-offset-4"
          >
            vaciarlo
          </button>{" "}
          para pedir este.
        </p>
      )}

      {/* Ya en el carrito: el número es también la puerta al panel, que es
          donde se cambia la cantidad y se ve el subtotal. */}
      {!conflict && inCart > 0 && (
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
