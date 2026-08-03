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
    // El fondo y el blur van en esta capa, a sangre: es la que queda fija
    // (`sticky top-0`) y la que tiene que tapar la grilla que pasa por debajo.
    // La caja con filete vive dentro, respetando el gutter — así se pega al
    // header sin saltos, pero se ve como un panel suelto, no como una barra.
    <div
      aria-busy={pending}
      className="bg-background/95 px-gutter sticky top-0 z-40 pt-6 pb-10 backdrop-blur-sm"
    >
      <div className="border-foreground bg-card flex w-full flex-wrap items-center gap-x-7 gap-y-4 border px-7 py-5">
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

        <div className="ml-auto flex items-center gap-6">
          <SortSelect
            inline
            value={filters.sort}
            onChange={(sort) => apply({ sort })}
            className="rounded-none border-transparent bg-transparent px-1 hover:bg-transparent"
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
            className="border-foreground rounded-none"
          >
            <Filter aria-hidden />
            Filtros
            {active > 0 && (
              <span className="bg-primary-loud text-primary-loud-foreground text-marginalia ml-1 px-1.5 font-mono">
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
    </div>
  );
}
