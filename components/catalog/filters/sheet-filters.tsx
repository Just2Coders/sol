"use client";

import { useState } from "react";
import { Filter } from "reicon-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ActiveFilterChips,
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

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">
              <Filter aria-hidden />
              Filtros
              {active > 0 && (
                <span className="bg-primary text-primary-foreground text-marginalia ml-1 rounded-md px-1.5 font-mono">
                  {active}
                </span>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>
                Se aplican al momento; puedes seguir viendo el catálogo detrás.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-6">
              <Field label="provincia">
                <ZoneSelect
                  value={filters.zone}
                  zones={zones}
                  onChange={(zone) => apply({ zone, supplier: null })}
                  className="w-full"
                />
              </Field>

              <Field label="proveedor">
                <SupplierSelect
                  value={filters.supplier}
                  suppliers={suppliers}
                  onChange={(supplier) => apply({ supplier })}
                  className="w-full"
                />
                {suppliers.length === 0 && (
                  <p className="text-muted-foreground text-caption">
                    Ningún proveedor opera en esa provincia todavía.
                  </p>
                )}
              </Field>

              <Field label="precio usd">
                <PriceRange
                  key={`${filters.minUsd}-${filters.maxUsd}`}
                  minUsd={filters.minUsd}
                  maxUsd={filters.maxUsd}
                  onChange={(range) => apply(range)}
                  className="w-full"
                />
              </Field>
            </SheetBody>

            <SheetFooter className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={clear}>
                Limpiar
              </Button>
              <SheetClose asChild>
                <Button>
                  Ver {visible} {visible === 1 ? "resultado" : "resultados"}
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
