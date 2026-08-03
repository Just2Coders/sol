"use client";

import Link from "next/link";
import { Minus, Plus, Shop, ShoppingCart, Trash } from "reicon-react";

import { CatalogMedia } from "@/components/catalog/catalog-media";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  cartCount,
  cartGroups,
  cartLineKey,
  cartSubtotalUsd,
  lineTotalUsd,
  MAX_LINE_QUANTITY,
  type CartGroup,
  type CartLine,
} from "@/lib/cart/lines";
import { useCartLines, useCartStore } from "@/lib/cart/store";
import { catalogItemHref } from "@/lib/catalog/filters";
import { cn, formatUsd } from "@/lib/utils";

/**
 * El carrito en la barra del sitio: el botón con la cuenta y el panel lateral
 * que abre.
 *
 * Van juntos porque son la misma pieza —el número es el resumen del panel— y
 * porque así el header no tiene que llevar estado: si el panel está abierto lo
 * sabe el store, que es también quien lo abre desde la ficha al añadir algo.
 *
 * Hasta que `localStorage` esté leído el carrito se ve vacío, así que el botón
 * sale del servidor y entra en el cliente exactamente igual.
 *
 * El reparto por proveedor solo se dibuja **cuando hay más de uno**: con uno
 * solo, un encabezado y un subtotal por grupo repetirían lo que ya dicen la
 * cabecera y el pie. Los grupos son los mismos que acabarán siendo filas de
 * `order_suppliers`, así que lo que se ve aquí es la forma real del pedido.
 */
export function CartPanel({ className }: { className?: string }) {
  const open = useCartStore((state) => state.open);
  const setOpen = useCartStore((state) => state.setOpen);
  const clear = useCartStore((state) => state.clear);
  const lines = useCartLines();

  const count = cartCount(lines);
  const groups = cartGroups(lines);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-nav ease-standard flex items-center gap-2 transition-colors duration-slow",
            className,
          )}
        >
          <ShoppingCart aria-hidden className="size-4" />
          {count > 0 && <span className="text-data font-mono">{count}</span>}
          <span className="sr-only">
            {count === 0
              ? "Carrito vacío"
              : `Ver el carrito · ${count} ${count === 1 ? "pieza" : "piezas"}`}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Tu pedido</SheetTitle>
          <SheetDescription>
            {groups.length === 0
              ? "Todavía no has elegido nada."
              : groups.length === 1
                ? `Lo entrega ${groups[0].supplierName}.`
                : `Lo entregan ${groups.length} proveedores, cada uno lo suyo. El pago es uno solo.`}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <SheetBody>
            <p className="text-muted-foreground text-body-sm">
              Los kits y los equipos que vayas eligiendo aparecen aquí.
            </p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/catalog" onClick={close}>
                Ver el catálogo
              </Link>
            </Button>
          </SheetBody>
        ) : (
          <>
            <SheetBody>
              {groups.length === 1 ? (
                <ul>
                  {lines.map((line) => (
                    <CartRow key={cartLineKey(line)} line={line} onNavigate={close} />
                  ))}
                </ul>
              ) : (
                groups.map((group) => (
                  <CartGroupBlock
                    key={group.supplierSlug}
                    group={group}
                    onNavigate={close}
                  />
                ))
              )}
            </SheetBody>

            <SheetFooter>
              <div className="flex items-baseline justify-between gap-6">
                <span className="text-muted-foreground text-label font-mono">
                  total
                </span>
                <span className="text-foreground text-heading-3">
                  {formatUsd(cartSubtotalUsd(lines))}
                </span>
              </div>

              <Button size="lg" className="mt-4 w-full" disabled>
                Ir al pago
              </Button>
              <div className="mt-3 flex items-baseline justify-between gap-6">
                <p className="text-muted-foreground text-marginalia font-mono">
                  checkout · próxima etapa
                </p>
                <button
                  type="button"
                  onClick={clear}
                  className="text-muted-foreground hover:text-destructive text-marginalia ease-standard font-mono underline underline-offset-4 transition-colors duration-base"
                >
                  vaciar
                </button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Lo que entrega un proveedor, cuando hay más de uno.
 *
 * El encabezado repite el patrón de "más de este proveedor" en la ficha
 * (rótulo mono con el icono de tienda), porque es lo mismo: una franja del
 * catálogo que pertenece a alguien. El subtotal cierra el grupo en vez de
 * abrirlo — primero qué llevas de él, después cuánto es.
 */
function CartGroupBlock({
  group,
  onNavigate,
}: {
  group: CartGroup;
  onNavigate: () => void;
}) {
  return (
    <section className="border-border-strong border-t pt-4 pb-2 first:border-t-0 first:pt-0">
      <h3 className="text-muted-foreground text-label flex items-center gap-2 font-mono">
        <Shop aria-hidden className="size-3.5 shrink-0" />
        {group.supplierName}
      </h3>

      <ul className="mt-3">
        {group.lines.map((line) => (
          <CartRow key={cartLineKey(line)} line={line} onNavigate={onNavigate} />
        ))}
      </ul>

      <p className="mt-3 flex items-baseline justify-between gap-6">
        <span className="text-muted-foreground text-marginalia font-mono">
          subtotal de {group.supplierName}
        </span>
        <span className="text-foreground text-data font-mono">
          {formatUsd(group.subtotalUsd)}
        </span>
      </p>
    </section>
  );
}

// Cómo se nombra cada tipo en la marginalia de la línea. Fuera del componente:
// es una tabla fija, no hace falta rearmarla en cada pintada.
const LINE_KIND: Record<CartLine["type"], string> = {
  KIT: "kit",
  PRODUCT: "producto",
  SERVICE: "instalación",
};

/**
 * Una línea del panel. El paso de cantidad se topa contra el stock que tenía la
 * ficha al añadirla: es una foto, no la verdad — el stock real se vuelve a
 * comprobar al crear la orden.
 */
function CartRow({
  line,
  onNavigate,
}: {
  line: CartLine;
  onNavigate: () => void;
}) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);

  const key = cartLineKey(line);
  const href = catalogItemHref(line.type, line.slug);
  const ceiling = line.stock ?? MAX_LINE_QUANTITY;

  return (
    <li className="border-border flex gap-4 border-b py-4 first:pt-0">
      <Link href={href} onClick={onNavigate} className="shrink-0" tabIndex={-1}>
        <CatalogMedia
          src={line.image}
          alt={line.name}
          sizes="64px"
          className="size-16 rounded-md"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={href}
          onClick={onNavigate}
          className="text-foreground text-body-sm underline-offset-4 hover:underline"
        >
          {line.name}
        </Link>
        <p className="text-muted-foreground text-marginalia font-mono">
          {LINE_KIND[line.type]} · {formatUsd(line.priceUsd)}{" "}
          {/* Una instalación por unidad de obra se cobra "c/panel"; lo demás va
              por piezas. */}
          {line.unitLabel ? `c/${line.unitLabel}` : "c/u"}
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setQuantity(key, line.quantity - 1)}
              title="Quitar una"
            >
              <Minus aria-hidden />
              <span className="sr-only">Quitar una unidad de {line.name}</span>
            </Button>
            <span className="text-foreground text-data w-6 text-center font-mono">
              {line.quantity}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={line.quantity >= ceiling}
              onClick={() => setQuantity(key, line.quantity + 1)}
              title="Añadir una"
            >
              <Plus aria-hidden />
              <span className="sr-only">Añadir una unidad de {line.name}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-1"
              onClick={() => remove(key)}
              title="Quitar del carrito"
            >
              <Trash aria-hidden />
              <span className="sr-only">Quitar {line.name} del pedido</span>
            </Button>
          </div>

          <span className="text-foreground text-data font-mono">
            {formatUsd(lineTotalUsd(line))}
          </span>
        </div>
      </div>
    </li>
  );
}
