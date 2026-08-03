import Link from "next/link";
import { ArrowUpRight, CalendarDate, Home } from "reicon-react";

import { AddInstallationButton } from "@/components/cart/add-installation-button";
import { CatalogDetailAccordionRow } from "@/components/catalog/detail/detail-accordion";
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
 * Fila propia del acordeón y no una casilla dentro del botón de compra:
 * contratar la mano de obra es una decisión aparte de comprar el equipo, y el
 * visitante puede llevarse solo una de las dos.
 *
 * Hoy quien instala es siempre el mismo proveedor que entrega —lo garantiza la
 * consulta—, y por eso la línea del carrito se arma con el proveedor del equipo.
 * En cuanto un servicio pueda trabajar sobre equipo ajeno (PLAN.md §Paso 2) eso
 * deja de valer: la línea tendrá que llevar el proveedor **del servicio**, o
 * caería en el grupo equivocado del pedido y se le liquidaría a quien no
 * trabajó.
 *
 * Sin ofertas cargadas la fila no existe: no se enseña un pliegue vacío
 * prometiendo un servicio que este proveedor no da.
 *
 * Se queda en el servidor entero menos el botón de cada fila.
 */
export function CatalogInstallations({
  installations,
  supplier,
}: {
  installations: CatalogInstallation[];
  supplier: CatalogItemSupplier;
}) {
  if (installations.length === 0) return null;

  return (
    <CatalogDetailAccordionRow
      value="installation"
      label="instalación"
      icon={Home}
    >
      <p className="text-muted-foreground text-body-sm max-w-[60ch]">
        La instala {supplier.name}, el mismo que entrega el equipo.
      </p>

      <ul className="border-border mt-4 border-t">
        {installations.map((installation) => {
          // La foto de la ficha del servicio que se guarda en el carrito: el
          // mismo trato que un producto o un kit, con `stock: null` porque la
          // mano de obra no tiene existencias.
          const item: CartItem = {
            type: "SERVICE",
            id: installation.id,
            slug: installation.slug,
            name: installation.name,
            priceUsd: installation.priceUsd,
            unitLabel: installation.unitLabel,
            image: installation.image,
            supplierSlug: supplier.slug,
            supplierName: supplier.name,
            stock: null,
          };

          return (
            <li key={installation.id} className="border-border border-b py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="text-foreground text-body">
                    {installation.name}
                  </span>
                  <Link
                    href={catalogItemHref("SERVICE", installation.slug)}
                    target="_blank"
                    rel="noopener"
                    title={`Abrir ${installation.name} en una pestaña nueva`}
                    className="text-muted-foreground hover:text-primary ease-standard -my-1 inline-flex size-7 shrink-0 items-center justify-center self-center rounded-md transition-colors duration-base"
                  >
                    <ArrowUpRight aria-hidden className="size-3.5" />
                    <span className="sr-only">
                      Abrir {installation.name} en una pestaña nueva
                    </span>
                  </Link>
                </span>

                <span className="text-foreground text-data font-mono">
                  {formatUsd(installation.priceUsd)}
                  {installation.unitLabel && (
                    <span className="text-muted-foreground">
                      {" "}
                      / {installation.unitLabel}
                    </span>
                  )}
                </span>
              </div>

              {installation.description && (
                <p className="text-muted-foreground text-body-sm mt-2 max-w-[60ch]">
                  {installation.description}
                </p>
              )}

              <div className="mt-3">
                <AddInstallationButton item={item} />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-muted-foreground text-marginalia mt-4 flex items-center gap-2 font-mono">
        <CalendarDate aria-hidden className="size-3.5 shrink-0" />
        la fecha se coordina después del pago
      </p>
    </CatalogDetailAccordionRow>
  );
}
