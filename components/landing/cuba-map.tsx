"use client";

import { useMemo, useState } from "react";

import type { ProvinceCoverage } from "@/lib/zones/coverage";
import { cn } from "@/lib/utils";
import { CUBA_PROVINCES, CUBA_VIEW_BOX } from "./cuba-geometry";

type CubaMapProps = {
  coverage: ProvinceCoverage[];
};

type MapProvince = {
  slug: string;
  name: string;
  d: string;
  supplierCount: number;
};

// Relleno según estado. `support` es la superficie neutra del sistema;
// `primary`, el único acento de acción, marca la provincia elegida; `muted`
// deja las provincias sin proveedores presentes pero apagadas, nunca invisibles.
function fillClass(available: boolean, selected: boolean) {
  if (selected) return "fill-primary";
  if (available) return "fill-support hover:fill-support-strong";
  return "fill-muted";
}

export function CubaMap({ coverage }: CubaMapProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const provinces = useMemo<MapProvince[]>(() => {
    const bySlug = new Map(coverage.map((c) => [c.slug, c]));
    return CUBA_PROVINCES.map(({ slug, name, d }) => ({
      slug,
      name,
      d,
      supplierCount: bySlug.get(slug)?.supplierCount ?? 0,
    }));
  }, [coverage]);

  const selectedProvince = provinces.find((p) => p.slug === selected) ?? null;

  // Isla de la Juventud es municipio especial, no provincia: no cuenta.
  const provinceCount = provinces.length - 1;
  const coveredCount = provinces.filter((p) => p.supplierCount > 0).length;

  return (
    <div className="relative">
      {/* Mapa: a partir de tablet, donde las provincias son objetivos cómodos. */}
      <svg
        viewBox={CUBA_VIEW_BOX}
        role="group"
        aria-label="Mapa de Cuba por provincias"
        className="hidden h-auto w-full md:block"
      >
        {provinces.map((province) => {
          const available = province.supplierCount > 0;
          const isSelected = province.slug === selected;

          return (
            <path
              key={province.slug}
              d={province.d}
              role="button"
              aria-label={province.name}
              aria-pressed={isSelected}
              aria-disabled={!available}
              tabIndex={available ? 0 : -1}
              onClick={available ? () => setSelected(province.slug) : undefined}
              onKeyDown={
                available
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(province.slug);
                      }
                    }
                  : undefined
              }
              className={cn(
                "stroke-background ease-standard transition-[fill] duration-base [stroke-width:1.2] [stroke-linejoin:round]",
                "focus-visible:stroke-ring focus-visible:outline-none focus-visible:[stroke-width:2.5]",
                available ? "cursor-pointer" : "cursor-default",
                fillClass(available, isSelected),
              )}
            >
              <title>
                {available
                  ? `${province.name} · ${province.supplierCount} ${province.supplierCount === 1 ? "proveedor" : "proveedores"}`
                  : `${province.name} · sin proveedores todavía`}
              </title>
            </path>
          );
        })}
      </svg>

      {/* En móvil el mapa deja de ser tocable: la misma elección, en lista. */}
      <ul className="grid grid-cols-2 gap-2 md:hidden">
        {provinces.map((province) => {
          const available = province.supplierCount > 0;
          const isSelected = province.slug === selected;

          return (
            <li key={province.slug}>
              <button
                type="button"
                disabled={!available}
                aria-pressed={isSelected}
                onClick={() => setSelected(province.slug)}
                className={cn(
                  "focus-visible:ring-ring text-body-sm ease-standard w-full rounded-md border p-3 text-left transition-colors duration-base focus-visible:ring-2 focus-visible:outline-none",
                  isSelected && "border-primary bg-primary text-foreground-inverse",
                  !isSelected &&
                    available &&
                    "border-border bg-card text-foreground hover:border-support-strong",
                  !available && "border-border text-muted-foreground/70 bg-muted",
                )}
              >
                {province.name}
                <span className="text-muted-foreground/80 text-marginalia mt-1 block font-mono">
                  {available
                    ? `${province.supplierCount} ${province.supplierCount === 1 ? "proveedor" : "proveedores"}`
                    : "sin cobertura"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Conteo, leyenda y provincia elegida, en columna. En escritorio caen
          sobre el mar del noreste, el hueco que deja la isla; en móvil vuelven
          al flujo, debajo de la lista. */}
      <aside className="mt-8 md:absolute md:top-0 md:right-0 md:mt-0 md:w-fit">
        <p className="text-muted-foreground text-marginalia font-mono">
          {provinceCount} provincias
          <br />
          {coveredCount} con proveedores
        </p>

        <ul className="text-muted-foreground text-marginalia mt-6 hidden flex-col gap-2 font-mono md:flex">
          <LegendItem swatch="bg-support" label="con proveedores" />
          <LegendItem swatch="bg-primary" label="tu provincia" />
          <LegendItem swatch="bg-muted" label="todavía no llegamos" />
        </ul>

        <p aria-live="polite" className="mt-6">
          {selectedProvince && (
            <>
              <span className="text-foreground text-body block font-medium">
                {selectedProvince.name}
              </span>
              <span className="text-muted-foreground text-marginalia block font-mono">
                {selectedProvince.supplierCount}{" "}
                {selectedProvince.supplierCount === 1 ? "proveedor" : "proveedores"}
              </span>
            </>
          )}
        </p>
      </aside>
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={cn("size-[10px] shrink-0 rounded-xs", swatch)} />
      {label}
    </li>
  );
}
