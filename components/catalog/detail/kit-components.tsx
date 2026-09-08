import Link from "next/link";
import { ArrowUpRight } from "reicon-react";

import { CatalogMedia } from "@/components/catalog/catalog-media";
import { catalogItemHref } from "@/lib/catalog/filters";
import { photoAnchorId } from "@/lib/catalog/photos";
import type { CatalogKitItem } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

// Los centavos se cierran por línea: el precio se guarda en numeric(10,2).
function lineTotalUsd(item: CatalogKitItem): number {
  return Math.round(item.unitPriceUsd * item.quantity * 100) / 100;
}

const THUMB_SIZES = "(min-width: 1024px) 20vw, 45vw";

/**
 * El desglose de un kit, en grilla: cada componente es su propia foto, no un
 * renglón de texto — es lo que lo distingue de un vistazo de la ficha técnica
 * de al lado, y hace del "qué incluye" algo que se hojea, no que se lee.
 *
 * La foto sigue llevando **dos salidas**, heredadas de la versión en lista:
 * saltar a su figura grande en la columna de la izquierda (`photoAnchorId`,
 * un ancla de verdad — funciona sin JavaScript) cuando el componente aportó
 * foto propia, y abrirlo como producto suelto en una pestaña nueva cuando se
 * vende por separado (`productActive`). Un componente que el proveedor retiró
 * del catálogo se sigue listando, pero sin el enlace que lo llevaría a un 404.
 */
export function CatalogKitComponents({
  items,
  photographed,
  itemsTotalUsd,
}: {
  items: CatalogKitItem[];
  /** Componentes que aportaron foto: los únicos cuya miniatura salta. */
  photographed: Set<string>;
  /** Lo que costaría comprar las piezas sueltas. */
  itemsTotalUsd: number;
}) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6">
        {items.map((item) => {
          const jumps = photographed.has(item.productId);
          const thumb = item.productImages[0] ?? null;

          const photo = (
            <CatalogMedia
              src={thumb}
              alt={item.productName}
              sizes={THUMB_SIZES}
              className="aspect-[4/3] rounded-md"
              duotone={jumps}
            />
          );

          return (
            <li key={item.productId} className="flex h-fit flex-col">
              {jumps ? (
                <a
                  href={`#${photoAnchorId(item.productId)}`}
                  className="group focus-visible:outline-ring block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  {photo}
                  <span className="sr-only"> — ver su foto</span>
                </a>
              ) : (
                photo
              )}

              <div className="mt-2 flex items-start justify-between gap-2">
                <p className="text-foreground text-body-sm min-w-0">
                  {item.productName}{" "}
                  <span className="text-muted-foreground text-data font-mono">
                    ×{item.quantity}
                  </span>
                </p>

                {item.productActive && (
                  <Link
                    href={catalogItemHref("PRODUCT", item.productSlug)}
                    target="_blank"
                    rel="noopener"
                    title={`Abrir ${item.productName} en una pestaña nueva`}
                    // Caja de 28px alrededor de un glifo de 14: el enlace es
                    // secundario, pero tiene que poder pulsarse con el dedo.
                    className="text-muted-foreground hover:text-primary ease-standard -my-1 -mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-base"
                  >
                    <ArrowUpRight aria-hidden className="size-3.5" />
                    <span className="sr-only">
                      Abrir {item.productName} en una pestaña nueva
                    </span>
                  </Link>
                )}
              </div>

              <p className="text-muted-foreground text-data font-mono">
                {formatUsd(lineTotalUsd(item))}
              </p>
            </li>
          );
        })}
      </ul>

      {/* La suma de las piezas sueltas: es lo que justifica el precio del kit,
          así que se enseña aunque no haya ahorro. */}
      <div className="border-border mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t pt-4">
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
