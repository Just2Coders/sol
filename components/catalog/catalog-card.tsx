import Link from "next/link";
import { AlertTriangle, ArrowRight, Box, Package, Shop } from "reicon-react";

import { CatalogMedia } from "@/components/catalog/catalog-media";
import { catalogItemHref } from "@/lib/catalog/filters";
import type { CatalogItem } from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

const GRID_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Card del catálogo, con la misma anatomía que `OfferCard` en la home
 * (`components/landing/kit-providers.tsx`): foto + dos barras de tinta cosidas
 * sin aire entre ellas. La diferencia es que aquí toda la ficha es el
 * enlace —hay demasiadas cards en la grilla para que cada una pida su propio
 * "ver más"— así que el CTA final es una etiqueta, no un segundo disparador.
 *
 * El pie va fuera de la tinta, en el papel: es donde vive el dato que no hay
 * que leer de un vistazo (qué es, quién lo vende) — la foto queda libre para
 * el producto y las barras para nombre y precio, que son lo que decide.
 */
export function CatalogCard({ item }: { item: CatalogItem }) {
  const isKit = item.type === "KIT";
  const kind = isKit ? "kit" : "producto";
  const KindIcon = isKit ? Package : Box;

  return (
    <li>
      <Link
        href={catalogItemHref(item.type, item.slug)}
        // `group`: la ficha entera dispara el duotono de su foto — el cursor
        // entra por cualquier parte del enlace, no solo por el recorte.
        className="group focus-visible:outline-ring ease-standard flex h-full flex-col focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <CatalogMedia
          src={item.image}
          alt={item.name}
          sizes={GRID_SIZES}
          className="aspect-[4/3]"
          duotone
        />

        <div className="bg-foreground text-background flex items-center justify-between gap-4 px-5 py-4">
          <h3 className="text-body font-bold">{item.name}</h3>
        </div>

        <div className="bg-foreground text-background border-background flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t px-5 pt-3.5 pb-4.5">
          <p className="text-data font-mono uppercase">
            {formatUsd(item.priceUsd)}
          </p>
          {item.outOfStock ? (
            <p className="text-warning text-marginalia inline-flex items-center gap-1.5 font-mono uppercase">
              <AlertTriangle aria-hidden className="size-3.5" />
              sin stock
            </p>
          ) : (
            item.summary && (
              <p className="text-data font-mono">{item.summary}</p>
            )
          )}
        </div>

        {/* El pie: qué es y quién lo vende, con la ficha entera ya cerrada
            arriba en tinta. Los dos iconos van del mismo tono muted que el
            texto — el `--primary` de la card ya lo lleva "Ver {kind}". */}
        <div className="border-border mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-5 py-3.5">
          <div className="text-marginalia tracking-mono-sm text-muted-foreground flex items-center gap-4 font-mono uppercase">
            <span className="inline-flex items-center gap-1.5">
              <KindIcon aria-hidden className="size-4" />
              {kind}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shop aria-hidden className="size-4" />
              {item.supplierName}
            </span>
          </div>

          <span className="text-label tracking-mono-sm text-primary-loud group-hover:text-primary-loud-hover ease-standard inline-flex items-center gap-2 font-mono uppercase transition-colors duration-base">
            Ver {kind}
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </div>
      </Link>
    </li>
  );
}
