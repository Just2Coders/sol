"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  cartLineKey,
  cartSupplier,
  clampQuantity,
  type CartItem,
  type CartLine,
} from "./lines";

/**
 * El carrito, en el cliente.
 *
 * Vive fuera del servidor a propósito: hasta el checkout no hay nada que
 * guardar en la base —ni orden, ni sesión obligatoria—, así que armarlo es
 * trabajo del navegador y el catálogo se sigue sirviendo estático. La única
 * huella es `localStorage`, para que cerrar la pestaña no borre lo que ya
 * estaba elegido.
 *
 * Lo que se guarda es una **foto** de la ficha (nombre, precio, stock del
 * momento). Nunca se cobra desde aquí: la Server Action del checkout vuelve a
 * leer el catálogo y son sus valores los que se copian a `order_items`.
 */

const STORAGE_KEY = "solaris.cart";

/** Qué pasó al intentar añadir algo — lo traduce a un aviso quien llama. */
export type AddToCartResult =
  | { ok: true; quantity: number }
  /** El carrito ya es de otro proveedor: una orden = un proveedor. */
  | { ok: false; reason: "other-supplier"; supplierName: string }
  /** Se quedó sin unidades entre que se pintó la ficha y se pulsó el botón. */
  | { ok: false; reason: "out-of-stock" };

type CartState = {
  lines: CartLine[];
  /**
   * Si el panel lateral está abierto. Vive aquí —y no en el header— porque lo
   * abren sitios que no son su botón: la ficha, tras añadir algo.
   */
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (item: CartItem, quantity?: number) => AddToCartResult;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      open: false,

      setOpen: (open) => set({ open }),

      add: (item, quantity = 1) => {
        const { lines } = get();

        const supplier = cartSupplier(lines);
        if (supplier && supplier.slug !== item.supplierSlug) {
          return {
            ok: false,
            reason: "other-supplier",
            supplierName: supplier.name,
          };
        }

        const key = cartLineKey(item);
        const existing = lines.find((line) => cartLineKey(line) === key);
        const next = clampQuantity(
          (existing?.quantity ?? 0) + quantity,
          item.stock,
        );
        if (next === 0) return { ok: false, reason: "out-of-stock" };

        set({
          lines: existing
            ? // La línea se reescribe entera, no solo la cantidad: el visitante
              // acaba de ver la ficha, así que su precio y su stock son más
              // frescos que la foto que había guardada.
              lines.map((line) =>
                cartLineKey(line) === key
                  ? { ...item, quantity: next }
                  : line,
              )
            : [...lines, { ...item, quantity: next }],
        });
        return { ok: true, quantity: next };
      },

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines: state.lines.flatMap((line) => {
            if (cartLineKey(line) !== key) return [line];
            const next = clampQuantity(quantity, line.stock);
            // Bajar de uno es quitarlo: un "×0" en la lista no significa nada.
            return next === 0 ? [] : [{ ...line, quantity: next }];
          }),
        })),

      remove: (key) =>
        set((state) => ({
          lines: state.lines.filter((line) => cartLineKey(line) !== key),
        })),

      clear: () => set({ lines: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Solo el contenido; las acciones se vuelven a crear en cada carga.
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

// `localStorage` es síncrono, así que para cuando React pinta la primera vez
// la lectura ya ocurrió — pasó al importar el módulo. La suscripción existe
// para el caso contrario y se dispara una sola vez.
function subscribeToHydration(onStoreChange: () => void): () => void {
  return useCartStore.persist.onFinishHydration(onStoreChange);
}

/**
 * El HTML lo pinta el servidor, que no tiene `localStorage`: si el primer
 * render del cliente ya usara las líneas guardadas, React encontraría un árbol
 * distinto al que hidrata. Por eso todo lo que dependa del carrito se lee
 * detrás de esta bandera, que vale `false` en el servidor y en la pintada con
 * la que React hidrata, y pasa a `true` justo después.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydration,
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}

// Una sola referencia para el carrito "todavía sin leer": devolver `[]` nuevo
// en cada render volvería a renderizar a todos sus lectores por nada.
const NO_LINES: CartLine[] = [];

/** Las líneas del carrito, vacías hasta que `localStorage` esté leído. */
export function useCartLines(): CartLine[] {
  const lines = useCartStore((state) => state.lines);
  return useCartHydrated() ? lines : NO_LINES;
}

/** Lo que el carrito dice sobre un item concreto de la ficha. */
export type CartItemState = {
  /** Unidades ya elegidas de este item. */
  inCart: number;
  /** El carrito ya es de otro proveedor: no cabe nada de este. */
  conflict: { slug: string; name: string } | null;
  /** Producto sin unidades; nunca un kit ni un servicio. */
  soldOut: boolean;
  /** Ya está en el carrito todo el stock que había. */
  complete: boolean;
};

/**
 * Todo esto es **derivado** del carrito, no un estado propio: si el visitante lo
 * vacía desde el panel, los botones de la ficha se destraban solos. Antes de que
 * `localStorage` esté leído el carrito se ve vacío, así que cada botón nace igual
 * en el HTML del servidor y en la primera pintada del cliente.
 *
 * Lo comparten los dos botones de una ficha —el del equipo y el de su
 * instalación—, que enseñan lo mismo con distinto tamaño.
 */
export function useCartItemState(item: CartItem): CartItemState {
  const lines = useCartLines();

  const key = cartLineKey(item);
  const inCart = lines.find((line) => cartLineKey(line) === key)?.quantity ?? 0;

  // Una orden se entrega por un solo proveedor (ver PLAN.md), así que un
  // carrito ya empezado con otro cierra la puerta hasta que se vacíe.
  const supplier = cartSupplier(lines);

  return {
    inCart,
    conflict: supplier && supplier.slug !== item.supplierSlug ? supplier : null,
    soldOut: item.stock === 0,
    complete: item.stock !== null && inCart >= item.stock,
  };
}
