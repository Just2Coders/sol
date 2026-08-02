import { MapPoint2, Truck } from "reicon-react";

import type { CatalogItemSupplier } from "@/lib/catalog/queries";

/**
 * Quién lo entrega.
 *
 * Del proveedor se enseña el nombre y cómo entrega, nunca su teléfono — el trato
 * pasa por la plataforma. La **cobertura** ya no está aquí: se subió al pie fijo
 * de la ficha (`CatalogSupplierCoverage`), porque es media decisión de compra y
 * no podía seguir enterrada en una fila plegada.
 */
export function CatalogSupplierBlock({
  supplier,
}: {
  supplier: CatalogItemSupplier;
}) {
  return (
    <div>
      <p className="text-foreground text-heading-3">{supplier.name}</p>

      <p className="text-muted-foreground text-body-sm mt-3 flex gap-2">
        <Truck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          La entrega se coordina contigo cuando el pago queda confirmado.
        </span>
      </p>
    </div>
  );
}

/**
 * Hasta dónde llega el proveedor, clavado al pie de la columna.
 *
 * No es un dato de relleno: en este catálogo un equipo solo se puede comprar si
 * el proveedor opera donde vive el visitante, así que esta línea decide si el
 * botón de arriba sirve de algo. Por eso vive fuera del acordeón y fuera del
 * scroll — plegada, la respondía solo quien ya había pensado en preguntarla.
 *
 * Sin zonas cargadas no hay pie: una tira que dice que no se sabe a dónde llega
 * asusta más de lo que informa, y el proveedor todavía puede estar dándose de
 * alta.
 */
export function CatalogSupplierCoverage({
  supplier,
}: {
  supplier: CatalogItemSupplier;
}) {
  if (supplier.zoneNames.length === 0) return null;

  return (
    <div className="border-border-strong lg:px-gutter flex gap-2 border-t px-6 py-4">
      <MapPoint2
        aria-hidden
        className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
      />
      <p className="text-muted-foreground text-marginalia font-mono">
        {supplier.name} llega a {supplier.zoneNames.join(" · ")}
      </p>
    </div>
  );
}
