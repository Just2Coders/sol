"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Filter } from "reicon-react";

import { Button } from "@/components/ui/button";
import {
  ActiveFilterChips,
  SortSelect,
  TypeSwitch,
  countActive,
  useFilterActions,
  type CatalogFiltersProps,
} from "./controls";

/**
 * El panel entra por su propio chunk: es lo único de la barra que arrastra el
 * diálogo de Radix (portal, focus trap, presence, scroll lock) y solo hace
 * falta cuando alguien decide filtrar. No necesita `ssr: false` — abajo no se
 * monta hasta que hay intención de abrirlo, así que en el render del servidor
 * no existe.
 */
const FilterSheet = dynamic(() =>
  import("./filter-sheet").then((mod) => mod.FilterSheet),
);

/**
 * Variante B — panel lateral.
 *
 * La barra se queda con las dos decisiones que se toman de un vistazo (qué tipo
 * y en qué orden) y manda el resto a un panel que se abre por la derecha. Lo
 * que está puesto no se esconde: sigue a la vista como fichas que se quitan de
 * una en una, así que el panel solo hace falta para *cambiar* filtros, no para
 * saber cuáles hay.
 *
 * Es la que mejor escala —caben diez filtros más sin tocar la barra— y la mejor
 * en móvil. A cambio, cuesta un clic descubrir qué se puede filtrar.
 */
export function SheetFilters({
  filters,
  zones,
  suppliers,
  counts,
}: CatalogFiltersProps) {
  const { apply, clear, pending } = useFilterActions(filters);
  const [open, setOpen] = useState(false);
  // El panel se pide al primer gesto que anuncia el clic —pasar por encima,
  // enfocar con el tabulador, apoyar el dedo—, no al clic en sí: para cuando
  // llega, el chunk ya está. Una vez montado se queda; volver a esconderlo solo
  // tiraría el trabajo hecho.
  const [mounted, setMounted] = useState(false);
  const preload = () => setMounted(true);

  const active = countActive(filters, ["zone", "supplier", "price"]);
  const visible = filters.type ? counts[filters.type] : counts.all;

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

      <ActiveFilterChips
        filters={filters}
        zones={zones}
        suppliers={suppliers}
        apply={apply}
      />

      <div className="ml-auto flex items-center gap-2">
        <SortSelect
          inline
          value={filters.sort}
          onChange={(sort) => apply({ sort })}
          className="w-56"
        />

        <Button
          variant="outline"
          aria-expanded={open}
          aria-haspopup="dialog"
          onPointerEnter={preload}
          onPointerDown={preload}
          onFocus={preload}
          onClick={() => {
            setMounted(true);
            setOpen(true);
          }}
        >
          <Filter aria-hidden />
          Filtros
          {active > 0 && (
            <span className="bg-primary text-primary-foreground text-marginalia ml-1 rounded-md px-1.5 font-mono">
              {active}
            </span>
          )}
        </Button>

        {mounted && (
          <FilterSheet
            open={open}
            onOpenChange={setOpen}
            filters={filters}
            zones={zones}
            suppliers={suppliers}
            apply={apply}
            clear={clear}
            visible={visible}
          />
        )}
      </div>
    </div>
  );
}
