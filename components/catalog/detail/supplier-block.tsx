import { Truck } from "reicon-react";

import type { CatalogItemSupplier } from "@/lib/catalog/queries";

/**
 * Hasta dónde llega el proveedor: quién es, dónde entrega y cómo.
 *
 * Antes eran dos piezas separadas — un bloque plegado con el nombre y cómo
 * entrega, y un pie fijo con las zonas — la misma decisión de compra partida
 * en dos sitios de la ficha. Ahora es una sola fila del acordeón, "alcance":
 * si el equipo llega a donde vive quien mira, se responde en un solo lugar.
 */
export function CatalogSupplierReach({
  supplier,
}: {
  supplier: CatalogItemSupplier;
}) {
  return (
    <div>
      <p className="text-foreground text-heading-3">{supplier.name}</p>

      {supplier.zoneNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {supplier.zoneNames.map((zone) => (
            <span
              key={zone}
              className="border-border text-foreground text-marginalia rounded-md border px-2.5 py-1 font-mono"
            >
              {zone}
            </span>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-body-sm mt-3 flex gap-2">
        <Truck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          La entrega se coordina contigo cuando el pago queda confirmado.
        </span>
      </p>
    </div>
  );
}
