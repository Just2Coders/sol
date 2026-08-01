import Link from "next/link";
import { Shop } from "reicon-react";

import { CatalogMedia } from "@/components/catalog/catalog-media";
import { catalogItemHref } from "@/lib/catalog/filters";
import type { CatalogRelated } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

/** Dos columnas dentro de la columna: la miniatura ronda los 200px de ancho. */
const RELATED_SIZES = "(min-width: 1024px) 22vw, 45vw";

/**
 * Lo demás que vende este proveedor, al pie de las secciones.
 *
 * Va **fuera** del acordeón y sin pliegue: es lo que ocupa el papel que sobra
 * cuando las secciones están cerradas, y una fila plegada que hay que abrir para
 * que llene algo no llena nada. Que sean fotos y no renglones de texto es lo que
 * la distingue de un vistazo de las filas de arriba.
 *
 * Del mismo proveedor y no del catálogo entero por una regla de negocio, no por
 * pereza: una orden la entrega uno solo, así que esto es lo único que de verdad
 * cabe en el mismo carrito que lo que se está mirando (ver `getSupplierRelated`).
 *
 * Sin nada que sugerir no hay bloque: un "más de este proveedor" vacío dice que
 * el proveedor no tiene nada más, que es justo lo que no conviene anunciar.
 */
export function CatalogSupplierRelated({
  items,
  supplierName,
}: {
  items: CatalogRelated[];
  supplierName: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="lg:px-gutter px-6 py-8">
      <h2 className="text-muted-foreground text-label flex items-center gap-2 font-mono">
        <Shop aria-hidden className="size-3.5 shrink-0" />
        más de {supplierName}
      </h2>

      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6">
        {items.map((item) => (
          <li key={`${item.type}-${item.slug}`}>
            <Link
              href={catalogItemHref(item.type, item.slug)}
              // `group`: la miniatura destapa su color con el enlace entero, el
              // mismo trato que la celda de la grilla.
              className="group focus-visible:outline-ring block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <CatalogMedia
                src={item.image}
                alt={item.name}
                sizes={RELATED_SIZES}
                className="aspect-[4/3] rounded-md"
                duotone
              />

              <p className="text-foreground text-body-sm ease-standard mt-2 transition-colors duration-base group-hover:text-primary">
                {item.name}
              </p>
              <p className="text-muted-foreground text-data mt-0.5 font-mono">
                {formatUsd(item.priceUsd)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
