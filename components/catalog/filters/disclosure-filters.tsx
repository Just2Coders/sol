"use client";

import { useState } from "react";
import { ChevronDown } from "reicon-react";

import { Button } from "@/components/ui/button";
import { hasNarrowingFilters } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils";
import {
  ActiveFilterChips,
  ClearButton,
  Field,
  PriceRange,
  SortSelect,
  SupplierSelect,
  TypeSwitch,
  ZoneSelect,
  countActive,
  useFilterActions,
  type CatalogFiltersProps,
} from "./controls";

/**
 * Variante C — en dos tiempos.
 *
 * Arriba, lo que usa todo el mundo: tipo, provincia y orden. Lo demás
 * (proveedor y precio) vive en una segunda fila que se despliega en el sitio,
 * sin tapar el catálogo ni mover el foco a otra ventana. Plegada, lo que esté
 * puesto se resume en fichas.
 *
 * Es el término medio: descubre los filtros sin abrir nada —el botón dice
 * cuántos hay— y no paga el salto de contexto del panel lateral. A cambio, al
 * desplegarse empuja la grilla hacia abajo.
 */
export function DisclosureFilters({
  filters,
  zones,
  suppliers,
  counts,
}: CatalogFiltersProps) {
  const { apply, clear, pending } = useFilterActions(filters);
  const hidden = countActive(filters, ["supplier", "price"]);
  const [open, setOpen] = useState(hidden > 0);

  return (
    <div
      aria-busy={pending}
      className="border-border bg-background/95 px-gutter sticky top-0 z-40 border-y py-3 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <TypeSwitch
          value={filters.type}
          counts={counts}
          onChange={(type) => apply({ type })}
        />

        <ZoneSelect
          inline
          value={filters.zone}
          zones={zones}
          onChange={(zone) => apply({ zone, supplier: null })}
          className="w-60"
        />

        {!open && (
          <ActiveFilterChips
            filters={filters}
            zones={zones}
            suppliers={suppliers}
            apply={apply}
          />
        )}

        <div className="ml-auto flex items-center gap-2">
          <SortSelect
            inline
            value={filters.sort}
            onChange={(sort) => apply({ sort })}
            className="w-56"
          />
          <Button
            variant="ghost"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            Más filtros
            {hidden > 0 && (
              <span className="text-emphasis text-marginalia font-mono">
                {hidden}
              </span>
            )}
            <ChevronDown
              aria-hidden
              className={cn(
                "ease-standard transition-transform duration-base",
                open && "rotate-180",
              )}
            />
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-border mt-3 flex flex-wrap items-end gap-x-6 gap-y-4 border-t pt-4">
          <Field label="proveedor">
            <SupplierSelect
              value={filters.supplier}
              suppliers={suppliers}
              onChange={(supplier) => apply({ supplier })}
              className="w-56"
            />
          </Field>

          <Field label="precio usd">
            <PriceRange
              key={`${filters.minUsd}-${filters.maxUsd}`}
              minUsd={filters.minUsd}
              maxUsd={filters.maxUsd}
              onChange={(range) => apply(range)}
              className="w-56"
            />
          </Field>

          {hasNarrowingFilters(filters) && (
            <div className="ml-auto">
              <ClearButton onClick={clear} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
