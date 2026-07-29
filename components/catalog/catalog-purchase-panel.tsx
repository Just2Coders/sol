import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { CartItem } from "@/lib/cart/lines";
import type { CatalogItemSupplier } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

/**
 * Columna de compra de una ficha, igual para kits y productos: precio, la nota
 * que cada uno tenga (stock o ahorro), el botón y quién lo entrega.
 *
 * El panel sigue siendo servidor: lo único que se hidrata es el botón, que es
 * lo único que necesita el carrito del navegador. Del proveedor se enseña el
 * nombre y su cobertura, nunca su teléfono — el trato pasa por la plataforma.
 */
export function CatalogPurchasePanel({
  item,
  note,
  supplier,
}: {
  /** La foto de la ficha que se guarda en el carrito al añadirla. */
  item: CartItem;
  note?: React.ReactNode;
  supplier: CatalogItemSupplier;
}) {
  return (
    <aside className="border-border bg-card rounded-md border p-6">
      <p className="text-muted-foreground text-label font-mono">precio</p>
      <p className="text-foreground text-heading-1 mt-2">
        {formatUsd(item.priceUsd)}
      </p>
      {note && <div className="mt-2">{note}</div>}

      <div className="mt-6">
        <AddToCartButton item={item} />
      </div>

      <div className="border-border mt-6 border-t pt-6">
        <p className="text-muted-foreground text-label font-mono">proveedor</p>
        <p className="text-foreground text-heading-3 mt-2">{supplier.name}</p>
        {supplier.zoneNames.length > 0 && (
          <p className="text-muted-foreground text-body-sm mt-2">
            Entrega en {supplier.zoneNames.join(" · ")}.
          </p>
        )}
      </div>
    </aside>
  );
}
