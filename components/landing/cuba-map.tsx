"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ProvinceCoverage } from "@/lib/zones/coverage";
import { cn } from "@/lib/utils";
import { CUBA_PROVINCES, CUBA_VIEW_BOX } from "./cuba-geometry";

// El viewBox es el sistema de coordenadas del mapa; el SVG se dibuja a ancho
// completo y sin recorte, así que un punto expresado como % del viewBox cae en
// el mismo % de la caja renderizada, a cualquier tamaño. Eso permite colocar el
// tooltip en porcentajes y olvidarse de medir el DOM.
const [VIEW_W, VIEW_H] = CUBA_VIEW_BOX.split(" ").slice(2).map(Number);

// Margen que se le da a la punta de una provincia antes de cruzar a la
// siguiente: bastante para atravesar el trazo que las separa, poco para que
// salir al mar se note inmediato.
const HIDE_GRACE_MS = 60;

type CubaMapProps = {
  coverage: ProvinceCoverage[];
};

type MapProvince = {
  slug: string;
  name: string;
  d: string;
  supplierCount: number;
};

/** Lo que muestra el tooltip y dónde, en % del viewBox. */
type Tip = {
  name: string;
  coverage: string;
  x: number;
  y: number;
};

// Relleno según estado. `support` es la superficie neutra del sistema;
// `primary`, el único acento de acción, marca la provincia elegida; `muted`
// deja las provincias sin proveedores presentes pero apagadas, nunca invisibles.
function fillClass(available: boolean, selected: boolean) {
  if (selected) return "fill-primary";
  if (available) return "fill-support hover:fill-support-strong";
  return "fill-muted";
}

/** "1 proveedor" · "3 proveedores". */
function suppliersCount(count: number) {
  return `${count} ${count === 1 ? "proveedor" : "proveedores"}`;
}

export function CubaMap({ coverage }: CubaMapProps) {
  const [selected, setSelected] = useState<string | null>(null);

  // Un único tooltip para las 16 provincias. Con uno por provincia —lo que hace
  // Radix, que monta un root por trigger— cambiar de provincia es desmontar y
  // volver a montar: no hay nada que animar entre medias. Manteniéndolo montado
  // y moviéndole `left`/`top`, la transición de CSS lo lleva de una a otra.
  const [tip, setTip] = useState<Tip | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function showTip(
    target: SVGPathElement,
    province: MapProvince,
    label: string,
  ) {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    // getBBox() da la caja del trazo en unidades del viewBox, que es justo el
    // espacio en el que colocamos el tooltip. Se ancla al centro superior.
    const box = target.getBBox();
    setTip({
      name: province.name,
      coverage: label,
      x: ((box.x + box.width / 2) / VIEW_W) * 100,
      y: (box.y / VIEW_H) * 100,
    });
  }

  // Salir de una provincia no lo oculta de inmediato: si el puntero entra en la
  // vecina dentro del margen, `showTip` cancela el cierre y el mismo nodo se
  // desliza. Sin esta gracia, cruzar el trazo lo desmontaría a cada paso.
  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setTip(null), HIDE_GRACE_MS);
  }

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
      {/* El tooltip se posiciona en % de este contenedor, así que tiene que
          medir exactamente lo que el SVG y nada más. */}
      <div className="relative hidden md:block">
        <svg
          viewBox={CUBA_VIEW_BOX}
          role="group"
          aria-label="Mapa de Cuba por provincias"
          className="h-auto w-full"
        >
          {provinces.map((province) => {
            const available = province.supplierCount > 0;
            const isSelected = province.slug === selected;
            const coverage = available
              ? suppliersCount(province.supplierCount)
              : "sin proveedores todavía";

            return (
              <path
                key={province.slug}
                d={province.d}
                role="button"
                aria-label={`${province.name} · ${coverage}`}
                aria-pressed={isSelected}
                aria-disabled={!available}
                tabIndex={available ? 0 : -1}
                onPointerEnter={(event) =>
                  showTip(event.currentTarget, province, coverage)
                }
                onPointerLeave={scheduleHide}
                onFocus={(event) =>
                  showTip(event.currentTarget, province, coverage)
                }
                onBlur={scheduleHide}
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
                  // El outline del navegador se dibuja sobre el bounding box
                  // del path: un rectángulo alrededor de la provincia, que
                  // además el `* { outline-ring/50 }` de la capa base tiñe de
                  // terracota. Se apaga siempre — el foco de teclado se marca
                  // engordando el trazo de la silueta, que sí tiene la forma.
                  "outline-none",
                  "focus-visible:stroke-ring focus-visible:[stroke-width:2.5]",
                  available ? "cursor-pointer" : "cursor-default",
                  fillClass(available, isSelected),
                )}
              />
            );
          })}
        </svg>

        {/* Decorativo a propósito: el aria-label de cada provincia ya dice el
            nombre y la cobertura, así que anunciarlo otra vez sería repetirse.
            Sustituye al <title> del SVG, que disparaba el tooltip gris del
            navegador con su retardo de un segundo. */}
        {tip && (
          <div
            aria-hidden
            style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
            className={cn(
              "border-border bg-popover text-popover-foreground pointer-events-none absolute z-10 -mt-2 w-max max-w-[30ch] -translate-x-1/2 -translate-y-full rounded-md border px-3 py-2 shadow-md",
              // Lo que hace que planee: al cambiar de provincia solo mutan
              // left/top sobre el mismo nodo, y la transición los interpola.
              "ease-standard transition-[left,top] duration-base",
              // Solo al aparecer. El movimiento posterior es la transición de
              // arriba, no esta animación.
              "animate-in fade-in-0 zoom-in-95",
            )}
          >
            <span className="text-body-sm block">{tip.name}</span>
            <span className="text-muted-foreground text-marginalia block font-mono">
              {tip.coverage}
            </span>
          </div>
        )}
      </div>

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
                  isSelected &&
                    "border-primary bg-primary text-foreground-inverse",
                  !isSelected &&
                    available &&
                    "border-border bg-card text-foreground hover:border-support-strong",
                  !available && "border-border text-muted-foreground/70 bg-muted",
                )}
              >
                {province.name}
                <span className="text-muted-foreground/80 text-marginalia mt-1 block font-mono">
                  {available
                    ? suppliersCount(province.supplierCount)
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
                {suppliersCount(selectedProvince.supplierCount)}
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
