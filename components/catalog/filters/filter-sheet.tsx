"use client";

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
} from "@/components/ui/sheet";
import {
  Field,
  PriceRange,
  SupplierSelect,
  ZoneSelect,
  type ApplyFilters,
  type CatalogFiltersProps,
} from "./controls";

/**
 * El panel lateral de filtros, en su propio módulo **a propósito**.
 *
 * Es la única pieza del catálogo que arrastra el diálogo de Radix entero
 * (portal, focus trap, presence, scroll lock) y la mayoría de las visitas no lo
 * abre nunca. Sacándolo de aquí, `sheet-filters.tsx` puede pedirlo con
 * `next/dynamic` y el bundle inicial de la ruta se queda solo con la barra.
 *
 * No lleva `SheetTrigger`: el botón vive fuera, en la barra, y este componente
 * ni siquiera se monta hasta que hay intención de abrirlo. Radix devuelve el
 * foco al elemento que lo tenía antes, así que el botón lo recupera al cerrar.
 */
export type FilterSheetProps = Pick<
  CatalogFiltersProps,
  "filters" | "zones" | "suppliers"
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apply: ApplyFilters;
  clear: () => void;
  /** Cuántos resultados hay bajo los filtros actuales. */
  visible: number;
};

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  zones,
  suppliers,
  apply,
  clear,
  visible,
}: FilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
  );
}
