import { Button } from "@/components/ui/button";
import type { CatalogItemSupplier } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

/**
 * Columna de compra de una ficha, igual para kits y productos: precio, la nota
 * que cada uno tenga (stock o ahorro), el botón y quién lo entrega.
 *
 * El botón nace deshabilitado a propósito: el carrito es la Etapa 6 y prometer
 * un flujo que todavía no existe sería peor que decirlo. Del proveedor se
 * enseña el nombre y su cobertura, nunca su teléfono — el trato pasa por la
 * plataforma.
 */
export function CatalogPurchasePanel({
  priceUsd,
  note,
  supplier,
}: {
  priceUsd: number;
  note?: React.ReactNode;
  supplier: CatalogItemSupplier;
}) {
  return (
    <aside className="border-border bg-card rounded-md border p-6">
      <p className="text-muted-foreground text-label font-mono">precio</p>
      <p className="text-foreground text-heading-1 mt-2">
        {formatUsd(priceUsd)}
      </p>
      {note && <div className="mt-2">{note}</div>}

      <Button size="lg" className="mt-6 w-full" disabled>
        Añadir al carrito
      </Button>
      <p className="text-muted-foreground text-marginalia mt-3 font-mono">
        carrito y pago · próxima etapa
      </p>

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
