import Link from "next/link";

import { CatalogMedia } from "@/components/catalog/catalog-media";
import { catalogItemHref } from "@/lib/catalog/filters";
import type { CatalogItem } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

const GRID_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Celda de la grilla. No es una tarjeta flotante: es un trozo de la retícula,
 * a sangre y sin esquina redondeada — las líneas que la separan las pone el
 * contenedor. Toda ella es el enlace, y al pasar por encima solo cambia la
 * superficie, que es la única señal que hace falta.
 *
 * El tipo y el proveedor van sobre la foto, arriba a la izquierda, para que el
 * pie quede limpio: nombre, resumen y precio.
 */
export function CatalogCard({ item }: { item: CatalogItem }) {
  return (
    <li className="bg-background">
      <Link
        href={catalogItemHref(item.type, item.slug)}
        // El foco se dibuja por dentro (offset negativo): un ring por fuera lo
        // taparían las celdas vecinas, que están pegadas sin margen.
        className="hover:bg-card focus-visible:outline-ring ease-standard flex h-full flex-col transition-colors duration-base focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <div className="relative">
          <CatalogMedia
            src={item.image}
            alt={item.name}
            sizes={GRID_SIZES}
            className="aspect-[4/3]"
          />
          <p className="text-muted-foreground text-marginalia absolute top-6 left-6 font-mono">
            {item.type === "KIT" ? "kit" : "producto"} · {item.supplierName}
          </p>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-foreground text-heading-3">{item.name}</h3>
          {item.summary && (
            <p className="text-muted-foreground text-body-sm mt-1">
              {item.summary}
            </p>
          )}

          <div className="mt-auto flex items-baseline justify-between gap-3 pt-8">
            <p className="text-foreground text-data font-mono">
              {formatUsd(item.priceUsd)}
            </p>
            {item.outOfStock && (
              <p className="text-warning text-marginalia font-mono">sin stock</p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
