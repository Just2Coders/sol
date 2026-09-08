"use client";

import Link from "next/link";
import { ArrowRight } from "reicon-react";

import { CatalogPurchaseBlock } from "@/components/catalog/detail/purchase-block";
import { catalogHref, EMPTY_FILTERS } from "@/lib/catalog/filters";
import { cartCoversService, type CartItem } from "@/lib/cart/lines";
import { useCartLines } from "@/lib/cart/store";
import type { EquipmentScope } from "@/lib/services/enums";

/**
 * El bloque de compra de un servicio, que no siempre hay.
 *
 * Un servicio dice sobre qué equipo trabaja, y solo el `ANY` sirve para
 * cualquiera —incluido el que el comprador consiguió fuera de Solaris—. Los
 * otros dos necesitan llegar con su equipo, así que venderlos a ciegas desde
 * esta página sería prometer un trabajo que su proveedor no aceptó hacer. La
 * ficha sigue existiendo porque la enlazan las fichas de los equipos; lo que
 * cambia es que, sin equipo delante, explica en vez de vender.
 *
 * **Por qué el estado que no vende es el que nace.** El HTML lo pinta el
 * servidor, que no puede saber qué hay en el carrito, así que uno de los dos
 * estados va a parpadear para alguien. Que parpadee el permisivo sería enseñar
 * un botón de comprar a quien no puede usarlo —y darle tiempo a pulsarlo—; al
 * revés, quien sí trae el equipo ve la explicación durante la pintada con la
 * que React hidrata y el bloque justo después. `localStorage` es síncrono, así
 * que eso es un fotograma.
 */
export function ServicePurchaseBlock({
  item,
  equipmentScope,
  supplierName,
  note,
}: {
  item: CartItem;
  equipmentScope: EquipmentScope;
  supplierName: string;
  note?: React.ReactNode;
}) {
  const lines = useCartLines();
  const covered = cartCoversService(lines, {
    equipmentScope,
    supplierSlug: item.supplierSlug,
  });

  if (covered) return <CatalogPurchaseBlock item={item} note={note} />;

  // `OWN` manda a lo de su propio proveedor; `PLATFORM` acepta cualquier equipo
  // de la plataforma, así que abre el catálogo entero.
  const href =
    equipmentScope === "OWN"
      ? catalogHref({ ...EMPTY_FILTERS, supplier: item.supplierSlug })
      : catalogHref(EMPTY_FILTERS);

  return (
    <div className="border-border bg-muted rounded-md border p-5">
      <p className="text-foreground text-body-sm max-w-[46ch]">
        {equipmentScope === "OWN"
          ? `Este trabajo lo hace ${supplierName} solo sobre equipos que vende él mismo.`
          : "Este trabajo se contrata junto al equipo que se va a instalar."}
      </p>

      <p className="text-muted-foreground text-body-sm mt-2 max-w-[46ch]">
        Añade a tu carrito el equipo que quieres instalar y esta instalación
        podrá contratarse desde su ficha —o desde aquí mismo—.
      </p>

      <Link
        href={href}
        className="text-primary text-nav ease-standard mt-4 inline-flex items-center gap-1.5 underline underline-offset-4 transition-colors duration-base"
      >
        {equipmentScope === "OWN"
          ? `Ver lo que vende ${supplierName}`
          : "Ver el catálogo"}
        <ArrowRight className="size-4" aria-hidden />
      </Link>

      {note && <div className="mt-4">{note}</div>}
    </div>
  );
}
