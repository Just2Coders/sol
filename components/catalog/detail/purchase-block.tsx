"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "reicon-react";

import { Button } from "@/components/ui/button";
import { MAX_LINE_QUANTITY, type CartItem } from "@/lib/cart/lines";
import { useCartItemState, useCartStore } from "@/lib/cart/store";

/**
 * El bloque de compra de una ficha: cuántos, el botón y en qué estado está.
 *
 * La cantidad se elige **antes** de añadir —no a golpes de "añadir otro"— porque
 * quien compra cuatro paneles no quiere pulsar cuatro veces. El tope no es
 * decorativo: nunca deja pedir más de lo que queda contando lo que ya hay en el
 * carrito, y si se agota mientras la ficha está abierta el botón se apaga solo
 * (todo aquí se deriva del carrito, ver `useCartItemState`).
 *
 * Vive en la cabecera fija de la ficha, así que se arma en **una fila** —el
 * selector y el botón, no uno debajo del otro— y todo lo que es estado o
 * aclaración baja a una tira de marginalia mono debajo. El selector no lleva
 * rótulo visible: con el botón compartiendo renglón, un `−  1  +` se entiende
 * sin que se lo anuncien, y el nombre del grupo lo lleva puesto para quien
 * navega con lector de pantalla.
 *
 * Al añadir se abre el panel lateral: es la confirmación de que el pedido creció,
 * y el sitio donde se cambia lo elegido.
 */
export function CatalogPurchaseBlock({
  item,
  note,
}: {
  item: CartItem;
  /** Aclaración propia del tipo: cómo se cobra un servicio, por ejemplo. */
  note?: React.ReactNode;
}) {
  const add = useCartStore((state) => state.add);
  const clear = useCartStore((state) => state.clear);
  const setOpen = useCartStore((state) => state.setOpen);
  const { inCart, conflict, soldOut, complete } = useCartItemState(item);

  const [quantity, setQuantity] = useState(1);

  // Cuánto se puede pedir todavía. Se calcula en el render y no en un efecto:
  // si el carrito cambia desde el panel, esto ya está al día.
  const ceiling =
    item.stock === null
      ? MAX_LINE_QUANTITY
      : Math.min(Math.max(item.stock - inCart, 0), MAX_LINE_QUANTITY);
  const chosen = Math.min(quantity, Math.max(ceiling, 1));
  const blocked = soldOut || complete || conflict !== null;
  // ¿Tiene algo que decir la tira de marginalia de debajo del botón?
  const hasState =
    item.stock !== null || note != null || (!conflict && inCart > 0);

  function handleAdd() {
    const result = add(item, chosen);
    if (!result.ok) return;
    setQuantity(1);
    setOpen(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Cantidad"
          className="flex items-center gap-1"
        >
          <Button
            variant="outline"
            size="icon"
            disabled={blocked || chosen <= 1}
            onClick={() => setQuantity(chosen - 1)}
          >
            <Minus aria-hidden />
            <span className="sr-only">Quitar una unidad</span>
          </Button>
          <span className="text-foreground text-data w-8 text-center font-mono">
            {chosen}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={blocked || chosen >= ceiling}
            onClick={() => setQuantity(chosen + 1)}
          >
            <Plus aria-hidden />
            <span className="sr-only">Añadir una unidad</span>
          </Button>
        </div>

        {/* Crece hasta llenar el renglón, con un mínimo por debajo del cual se
            baja a su propia línea: en la columna estrecha de un portátil el
            texto del botón no se parte nunca. */}
        <Button
          size="lg"
          className="min-w-44 flex-1"
          disabled={blocked}
          onClick={handleAdd}
        >
          <ShoppingCart aria-hidden />
          {soldOut
            ? "Sin stock"
            : complete
              ? "Sin más unidades"
              : "Añadir al carrito"}
        </Button>
      </div>

      {/* La tira de estado: existencias, cómo se cobra y lo que ya va en el
          carrito, todo en el mismo renglón mientras quepa. Solo se monta si
          alguno de los tres tiene algo que decir — un contenedor vacío seguiría
          gastando su margen, y esto es una cabecera que se mide en píxeles. */}
      {hasState && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <CatalogStockState stock={item.stock} inCart={inCart} />

          {note}

          {/* Ya en el carrito: el número es también la puerta al panel, que es
              donde se cambia la cantidad y se ve el subtotal. */}
          {!conflict && inCart > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-muted-foreground hover:text-foreground text-marginalia ease-standard font-mono underline underline-offset-4 transition-colors duration-base"
            >
              en el carrito · {inCart}
            </button>
          )}
        </div>
      )}

      {conflict && (
        <p className="text-warning text-body-sm mt-2">
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
    </div>
  );
}

/**
 * Las existencias, cuando el item las tiene. Un kit y un servicio no llevan:
 * el kit se arma con lo que haya y la mano de obra no se agota en un almacén.
 */
function CatalogStockState({
  stock,
  inCart,
}: {
  stock: number | null;
  inCart: number;
}) {
  if (stock === null) return null;

  if (stock === 0) {
    return (
      <p className="text-warning text-marginalia font-mono">
        sin stock ahora mismo
      </p>
    );
  }

  const left = Math.max(stock - inCart, 0);
  return (
    <p className="text-success text-marginalia flex items-center gap-1.5 font-mono">
      <Check className="size-3.5" aria-hidden />
      {left === 0
        ? "todo en tu carrito"
        : `${left} ${left === 1 ? "unidad" : "unidades"} disponibles`}
    </p>
  );
}
