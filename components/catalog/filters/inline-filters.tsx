"use client";

import { hasNarrowingFilters } from "@/lib/catalog/filters";
import {
  ClearButton,
  PriceRange,
  SortSelect,
  SupplierSelect,
  TypeSwitch,
  ZoneSelect,
  useFilterActions,
  type CatalogFiltersProps,
} from "./controls";

/**
 * Variante A — barra compacta.
 *
 * Todo sigue a la vista, pero en una sola fila: la etiqueta de cada filtro se
 * mete dentro del control ("provincia · Toda la isla") en vez de vivir en una
 * fila de rótulos encima, y el precio se manda solo al salir del campo, sin
 * botón. La barra pasa de dos alturas a una.
 *
 * Es la que menos cambia los hábitos: nadie tiene que abrir nada para ver qué
 * se puede filtrar. A cambio, es la que peor envejece cuando entren más filtros.
 */
export function InlineFilters({
  filters,
  zones,
  suppliers,
  counts,
}: CatalogFiltersProps) {
  const { apply, clear, pending } = useFilterActions(filters);

  return (
    <div
      aria-busy={pending}
      className="border-border bg-background/95 px-gutter sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-3 border-y py-3 backdrop-blur-sm"
    >
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

      <SupplierSelect
        inline
        value={filters.supplier}
        suppliers={suppliers}
        onChange={(supplier) => apply({ supplier })}
        className="w-56"
      />

      <PriceRange
        key={`${filters.minUsd}-${filters.maxUsd}`}
        minUsd={filters.minUsd}
        maxUsd={filters.maxUsd}
        onChange={(range) => apply(range)}
        className="w-56"
      />

      <div className="ml-auto flex items-center gap-2">
        {hasNarrowingFilters(filters) && <ClearButton onClick={clear} />}
        <SortSelect
          inline
          value={filters.sort}
          onChange={(sort) => apply({ sort })}
          className="w-56"
        />
      </div>
    </div>
  );
}
