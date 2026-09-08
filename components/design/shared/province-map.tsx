"use client";

import { useMemo, useState } from "react";

import { CUBA_PROVINCES, CUBA_VIEW_BOX } from "@/components/landing/cuba-geometry";
import { cn } from "@/lib/utils";
import type { ProvinceCoverage } from "@/lib/zones/coverage";

/**
 * El mapa de las exploraciones de landing.
 *
 * Es el `CubaMap` de producción reducido a lo que se está comparando: la
 * silueta, los tres estados y la elección. El tooltip flotante no viaja aquí a
 * propósito —es idéntico en las tres variantes, así que no aporta nada a la
 * comparación y sí mucho markup—, y el relleno no lo decide el componente: lo
 * pasa cada variante en `tone`, porque una de ellas pinta la isla en terracota
 * sobre terracota y otra sobre el lienzo oscuro.
 */

export type MapTone = {
  /** Provincia con proveedores: lo que se puede pulsar. */
  available: string;
  /** La provincia elegida. */
  selected: string;
  /** Sin proveedores todavía: presente, apagada, nunca invisible. */
  empty: string;
  /**
   * Las tres muestras de la leyenda, en `bg-*`. Van escritas aparte y no
   * derivadas de los `fill-*` de arriba porque Tailwind escanea el código
   * fuente: una clase compuesta en tiempo de ejecución nunca se compila.
   */
  swatches: [available: string, selected: string, empty: string];
  /** El trazo que las separa; siempre el fondo de la sección. */
  stroke: string;
  /** Rótulos, leyenda y lista móvil. */
  chrome: string;
  /** Filete de la lista móvil y de la leyenda. */
  line: string;
};

function suppliersCount(count: number) {
  return `${count} ${count === 1 ? "proveedor" : "proveedores"}`;
}

export function ProvinceMap({
  coverage,
  tone,
  className,
  asideClassName,
}: {
  coverage: ProvinceCoverage[];
  tone: MapTone;
  className?: string;
  /** Dónde caen conteo, leyenda y lectura: cada variante lo coloca distinto. */
  asideClassName?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const provinces = useMemo(() => {
    const bySlug = new Map(coverage.map((zone) => [zone.slug, zone]));
    return CUBA_PROVINCES.map(({ slug, name, d }) => ({
      slug,
      name,
      d,
      supplierCount: bySlug.get(slug)?.supplierCount ?? 0,
    }));
  }, [coverage]);

  const chosen = provinces.find((province) => province.slug === selected) ?? null;
  // Isla de la Juventud es municipio especial, no provincia: no cuenta.
  const provinceCount = provinces.length - 1;
  const coveredCount = provinces.filter((p) => p.supplierCount > 0).length;

  return (
    <div className={className}>
      <svg
        viewBox={CUBA_VIEW_BOX}
        role="group"
        aria-label="Mapa de Cuba por provincias"
        className="hidden h-auto w-full md:block"
      >
        {provinces.map((province) => {
          const available = province.supplierCount > 0;
          const isSelected = province.slug === selected;
          const label = available
            ? suppliersCount(province.supplierCount)
            : "sin proveedores todavía";

          return (
            <path
              key={province.slug}
              d={province.d}
              role="button"
              aria-label={`${province.name} · ${label}`}
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
                "ease-standard transition-[fill] duration-base [stroke-linejoin:round] [stroke-width:1.2]",
                // El outline del navegador dibuja un rectángulo alrededor del
                // path; el foco se marca engordando la propia silueta.
                "outline-none focus-visible:stroke-ring focus-visible:[stroke-width:2.5]",
                tone.stroke,
                available ? "cursor-pointer" : "cursor-default",
                isSelected ? tone.selected : available ? tone.available : tone.empty,
              )}
            />
          );
        })}
      </svg>

      {/* Donde el mapa no se puede tocar, la misma elección en lista. */}
      <ul className="flex flex-col md:hidden">
        {provinces.map((province) => {
          const available = province.supplierCount > 0;
          return (
            <li key={province.slug}>
              <button
                type="button"
                disabled={!available}
                aria-pressed={province.slug === selected}
                onClick={() => setSelected(province.slug)}
                className={cn(
                  "text-body-sm flex w-full items-baseline justify-between gap-4 rounded-none border-t py-3 text-left",
                  tone.line,
                  province.slug === selected && "font-medium",
                  !available && "opacity-50",
                )}
              >
                {province.name}
                <span className={cn("text-marginalia font-mono", tone.chrome)}>
                  {available ? suppliersCount(province.supplierCount) : "sin cobertura"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <aside className={cn("text-marginalia font-mono", tone.chrome, asideClassName)}>
        <p>
          {provinceCount} provincias · {coveredCount} con proveedores
        </p>

        <ul className="mt-6 flex flex-col gap-2">
          <LegendItem swatch={tone.swatches[0]} label="con proveedores" />
          <LegendItem swatch={tone.swatches[1]} label="tu provincia" />
          <LegendItem swatch={tone.swatches[2]} label="todavía no llegamos" />
        </ul>

        <p aria-live="polite" className="mt-6 min-h-8">
          {chosen && (
            <>
              {chosen.name}
              <br />
              {suppliersCount(chosen.supplierCount)}
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
      <span
        aria-hidden
        className={cn("size-[10px] shrink-0 rounded-none", swatch)}
      />
      {label}
    </li>
  );
}
