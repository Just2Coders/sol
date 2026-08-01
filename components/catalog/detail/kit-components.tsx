import Link from "next/link";
import { ArrowUpRight, Image as ImageIcon } from "reicon-react";

import { catalogItemHref } from "@/lib/catalog/filters";
import { photoAnchorId } from "@/lib/catalog/photos";
import type { CatalogKitItem } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

// Los centavos se cierran por línea: el precio se guarda en numeric(10,2).
function lineTotalUsd(item: CatalogKitItem): number {
  return Math.round(item.unitPriceUsd * item.quantity * 100) / 100;
}

/**
 * El desglose de un kit, con dos salidas por componente.
 *
 * El nombre lleva a **su foto** en la columna de la izquierda: es la pregunta
 * que se hace quien mira un kit ("¿cuál de estos es el inversor?"), y se resuelve
 * sin salir de la ficha ni perder el sitio. Es un ancla de verdad, así que
 * funciona sin JavaScript y el navegador se encarga del desplazamiento suave.
 *
 * La flecha de al lado es la otra salida: abre el componente como producto
 * suelto en una pestaña nueva, para comparar sin abandonar el kit. Solo aparece
 * si ese producto se vende por separado (`productActive`); si el proveedor lo
 * retiró del catálogo, la pieza se sigue listando pero no enlaza a un 404.
 */
export function CatalogKitComponents({
  items,
  photographed,
  itemsTotalUsd,
}: {
  items: CatalogKitItem[];
  /** Componentes que aportaron foto: los únicos cuyo nombre puede saltar. */
  photographed: Set<string>;
  /** Lo que costaría comprar las piezas sueltas. */
  itemsTotalUsd: number;
}) {
  return (
    <>
      <ul>
        {items.map((item) => {
          const jumps = photographed.has(item.productId);

          return (
            <li
              key={item.productId}
              className="border-border flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b py-3"
            >
              <span className="flex min-w-0 items-baseline gap-2">
                {jumps ? (
                  <a
                    href={`#${photoAnchorId(item.productId)}`}
                    className="text-foreground text-body ease-standard group inline-flex items-baseline gap-2 underline-offset-4 transition-colors duration-base hover:underline"
                  >
                    <ImageIcon
                      aria-hidden
                      className="text-muted-foreground group-hover:text-primary ease-standard size-3.5 shrink-0 self-center transition-colors duration-base"
                    />
                    {item.productName}
                    <span className="sr-only"> — ver su foto</span>
                  </a>
                ) : (
                  <span className="text-foreground text-body">
                    {item.productName}
                  </span>
                )}

                {item.productActive && (
                  <Link
                    href={catalogItemHref("PRODUCT", item.productSlug)}
                    target="_blank"
                    rel="noopener"
                    title={`Abrir ${item.productName} en una pestaña nueva`}
                    // Caja de 28px alrededor de un glifo de 14: el enlace es
                    // secundario, pero tiene que poder pulsarse con el dedo.
                    className="text-muted-foreground hover:text-primary ease-standard -my-1 inline-flex size-7 shrink-0 items-center justify-center self-center rounded-md transition-colors duration-base"
                  >
                    <ArrowUpRight aria-hidden className="size-3.5" />
                    <span className="sr-only">
                      Abrir {item.productName} en una pestaña nueva
                    </span>
                  </Link>
                )}

                <span className="text-muted-foreground text-data font-mono">
                  ×{item.quantity}
                </span>
              </span>

              <span className="text-muted-foreground text-data font-mono">
                {formatUsd(lineTotalUsd(item))}
              </span>
            </li>
          );
        })}
      </ul>

      {/* La suma de las piezas sueltas: es lo que justifica el precio del kit,
          así que se enseña aunque no haya ahorro. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
        <span className="text-muted-foreground text-body-sm">
          Comprando cada pieza por separado
        </span>
        <span className="text-muted-foreground text-data font-mono">
          {formatUsd(itemsTotalUsd)}
        </span>
      </div>
    </>
  );
}
