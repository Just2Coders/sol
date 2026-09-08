import Link from "next/link";
import { ArrowUpRight, CalendarDate, InfoCircle } from "reicon-react";

import { InstallationCheckbox } from "@/components/cart/installation-checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CartItem } from "@/lib/cart/lines";
import { catalogItemHref } from "@/lib/catalog/filters";
import type {
  CatalogInstallation,
  CatalogItemSupplier,
} from "@/lib/catalog/queries";
import { formatUsd } from "@/lib/utils";

/**
 * La instalación que se puede contratar junto al equipo de esta ficha.
 *
 * Vive en la cabecera fija, pegada al botón de compra, y no plegada en el
 * acordeón: contratar la mano de obra es una decisión aparte de comprar el
 * equipo, pero es una decisión que se toma en el mismo momento — y una que
 * hay que abrir para ver no se toma.
 *
 * Cada oferta es un checkbox y no un botón: se contrata o no se contrata, así
 * que no hace falta más que marcarla. Lo que antes se explicaba en prosa
 * —quién la hace cuando no es quien vende, en qué consiste— vive detrás de un
 * icono de información, junto al nombre: la fila dice lo mínimo para decidir,
 * y el resto está a un hover.
 *
 * Quien instala **no siempre es quien vende**: un servicio abierto a equipo
 * ajeno puede ofrecerse aquí siendo de otro proveedor. Por eso la línea del
 * carrito se arma con el proveedor de la instalación y no con el del equipo —si
 * no, caería en el grupo equivocado del pedido y se le liquidaría a quien no
 * trabajó.
 *
 * Sin ofertas cargadas el bloque no existe: no se enseña una oferta que este
 * proveedor no da.
 *
 * Se queda en el servidor entero menos el checkbox de cada fila.
 */
export function CatalogInstallations({
  installations,
  supplier,
}: {
  installations: CatalogInstallation[];
  supplier: CatalogItemSupplier;
}) {
  if (installations.length === 0) return null;

  const sameSupplier = installations.every(
    (i) => i.supplier.slug === supplier.slug,
  );

  return (
    <div className="border-border mt-7 border-t pt-6">
      <div className="flex items-center gap-1.5">
        <p className="text-muted-foreground text-marginalia font-mono uppercase">
          instalación
        </p>

        <Tooltip>
          <TooltipTrigger className="text-muted-foreground hover:text-foreground ease-standard -my-1 flex size-6 items-center justify-center transition-colors duration-base">
            <InfoCircle aria-hidden className="size-3.5" />
            <span className="sr-only">Sobre la instalación</span>
          </TooltipTrigger>
          <TooltipContent>
            {sameSupplier
              ? `La instala ${supplier.name}, el mismo que entrega el equipo.`
              : "No todas las hace quien entrega el equipo: cada una dice de quién es."}
          </TooltipContent>
        </Tooltip>
      </div>

      <ul className="mt-3">
        {installations.map((installation) => {
          // La foto de la ficha del servicio que se guarda en el carrito: el
          // mismo trato que un producto o un kit, con `stock: null` porque la
          // mano de obra no tiene existencias. El proveedor es el **suyo**, no
          // el del equipo: es lo que decide en qué parte del pedido cae.
          const item: CartItem = {
            type: "SERVICE",
            id: installation.id,
            slug: installation.slug,
            name: installation.name,
            priceUsd: installation.priceUsd,
            unitLabel: installation.unitLabel,
            image: installation.image,
            supplierSlug: installation.supplier.slug,
            supplierName: installation.supplier.name,
            stock: null,
          };
          const external = installation.supplier.slug !== supplier.slug;
          const hasDetails = external || installation.description != null;

          return (
            <li
              key={installation.id}
              className="border-border flex items-center gap-3 border-t py-3 first:border-t-0 first:pt-3"
            >
              <InstallationCheckbox item={item} />

              <span className="flex min-w-0 flex-1 items-baseline gap-1">
                <span className="text-foreground text-body-sm truncate">
                  {installation.name}
                </span>

                {/* Quién la hace cuando no es quien vende, y en qué consiste:
                    lo que antes eran dos párrafos siempre visibles, ahora
                    detrás de un hover. Solo aparece si hay algo que decir. */}
                {hasDetails && (
                  <Tooltip>
                    <TooltipTrigger className="text-muted-foreground hover:text-foreground ease-standard -my-1 flex size-6 shrink-0 items-center justify-center transition-colors duration-base">
                      <InfoCircle aria-hidden className="size-3.5" />
                      <span className="sr-only">
                        Detalles de {installation.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {external && `La hace ${installation.supplier.name}. `}
                      {installation.description}
                    </TooltipContent>
                  </Tooltip>
                )}

                <Link
                  href={catalogItemHref("SERVICE", installation.slug)}
                  target="_blank"
                  rel="noopener"
                  title={`Abrir ${installation.name} en una pestaña nueva`}
                  className="text-muted-foreground hover:text-primary ease-standard -my-1 inline-flex size-6 shrink-0 items-center justify-center self-center rounded-md transition-colors duration-base"
                >
                  <ArrowUpRight aria-hidden className="size-3.5" />
                  <span className="sr-only">
                    Abrir {installation.name} en una pestaña nueva
                  </span>
                </Link>
              </span>

              <span className="text-foreground text-data shrink-0 font-mono">
                {formatUsd(installation.priceUsd)}
                {installation.unitLabel && (
                  <span className="text-muted-foreground">
                    {" "}
                    / {installation.unitLabel}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-muted-foreground text-marginalia mt-1 flex items-center gap-2 border-t border-border pt-4 font-mono">
        <CalendarDate aria-hidden className="size-3.5 shrink-0" />
        la fecha se coordina después del pago
      </p>
    </div>
  );
}
