"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sort } from "reicon-react";

import { selectZone } from "@/app/actions/preferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_SORT,
  type CatalogFilters,
  type CatalogSort,
  type CatalogType,
} from "@/lib/catalog/filters";
import { catalogHref } from "@/lib/catalog/filters";
import type { ZoneFilterGroup } from "@/lib/zones/queries";
import { cn, formatUsd } from "@/lib/utils";

/**
 * Piezas compartidas por las variantes de la barra de filtros.
 *
 * Aquí vive todo lo que no cambia entre variantes —qué hace cada control y cómo
 * se escribe el filtro en la URL— para que cada variante sea solo una manera de
 * colocarlos. Así se pueden probar y descartar sin tocar la lógica.
 */

export type CatalogFiltersProps = {
  filters: CatalogFilters;
  zones: ZoneFilterGroup[];
  /** Proveedores del ámbito: los que operan en la zona elegida. */
  suppliers: { name: string; slug: string }[];
  counts: { all: number; KIT: number; PRODUCT: number };
};

// Radix no admite un item con value="", así que "sin filtro" necesita centinela.
const ANY = "any";

/**
 * Forma común de todo control de filtro.
 *
 * · Esquina: el sistema redondea a 4px (`--radius`, o sea `rounded-md`), como
 *   las celdas del catálogo y los botones; los primitivos de shadcn vienen a
 *   10px, así que hay que pisarlos.
 * · Alto: 32px, que es el alto nativo de `Input` y `SelectTrigger` (`h-8`) y el
 *   del `Button` en su tamaño por defecto. Por eso los botones de esta barra no
 *   llevan `size="lg"` (36px) y las pills se fuerzan a 32: mezclar los tres era
 *   lo que hacía que nada cuadrara en la misma línea. No se puede subir el alto
 *   con una clase suelta —el `data-[size=default]:h-8` del select gana por
 *   especificidad—, así que la altura del sistema es la que manda.
 */
export const CONTROL_SHAPE = "rounded-md";

/** El panel desplegable del select también, o el borde canta al abrirlo. */
const PANEL_SHAPE = "rounded-md";

// ─── Acciones ────────────────────────────────────────────────────────────────

export function useFilterActions(filters: CatalogFilters) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(patch: Partial<CatalogFilters>) {
    // Cambiar un filtro devuelve el listado a la primera página: quedarse en la
    // 7 tras estrechar el precio deja al visitante mirando un vacío que no
    // entiende. Solo la propia paginación pasa un `page` explícito.
    const next = { ...filters, page: 1, ...patch };

    // La cookie se escribe **antes** de navegar: si fueran en paralelo, el
    // render de la URL nueva podría leer todavía la zona vieja.
    if (patch.zone !== undefined) {
      const zone = patch.zone;
      startTransition(async () => {
        await selectZone(zone);
        router.replace(catalogHref(next), { scroll: false });
      });
      return;
    }

    startTransition(() => {
      router.replace(catalogHref(next), { scroll: false });
    });
  }

  /** Deja el ámbito (la zona) y limpia lo demás. */
  function clear() {
    apply({
      supplier: null,
      type: null,
      minUsd: null,
      maxUsd: null,
      sort: DEFAULT_SORT,
    });
  }

  return { apply, clear, pending };
}

export type ApplyFilters = ReturnType<typeof useFilterActions>["apply"];

/** Cuántos filtros hay puestos de los que la variante esconde. */
export function countActive(
  filters: CatalogFilters,
  keys: ("zone" | "supplier" | "type" | "price")[],
): number {
  return keys.filter((key) => {
    if (key === "price") return filters.minUsd !== null || filters.maxUsd !== null;
    return filters[key] !== null;
  }).length;
}

// ─── Controles ───────────────────────────────────────────────────────────────

/** Etiqueta mono encima de un control; solo la usan las variantes que la tienen. */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-muted-foreground text-label font-mono">{label}</span>
      {children}
    </div>
  );
}

const TYPE_OPTIONS: { value: CatalogType | null; label: string }[] = [
  { value: null, label: "Todo" },
  { value: "KIT", label: "Kits" },
  { value: "PRODUCT", label: "Productos" },
];

export function TypeSwitch({
  value,
  counts,
  onChange,
  className,
}: {
  value: CatalogType | null;
  counts: { all: number; KIT: number; PRODUCT: number };
  onChange: (type: CatalogType | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {TYPE_OPTIONS.map((option) => {
        const active = option.value === value;
        const count = option.value === null ? counts.all : counts[option.value];
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "text-label tracking-mono-sm border-foreground ease-standard flex h-8 items-center border px-3 font-mono uppercase transition-colors duration-base",
              active
                ? "bg-primary-loud text-primary-loud-foreground border-primary-loud"
                : "text-foreground hover:bg-muted",
            )}
          >
            {option.label} &middot; {count}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Select con su dimensión escrita dentro ("provincia · Toda la isla"): cuesta
 * los mismos píxeles de alto que el control y ahorra la fila de etiquetas.
 *
 * Con `icon` esa dimensión la dice el icono en vez de la palabra. Sirve cuando
 * el control tiene un glifo que se lee de un vistazo —ordenar lo tiene— y la
 * palabra suelta delante del valor se leía como parte de la frase. El `label`
 * no desaparece: sigue siendo el nombre accesible del control, que ahora es lo
 * único que lo nombra.
 */
function InlineSelect({
  label,
  icon: Icon,
  value,
  onValueChange,
  className,
  disabled,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        disabled={disabled}
        className={cn(CONTROL_SHAPE, className)}
      >
        <span className="flex items-center gap-2 overflow-hidden">
          {Icon ? (
            <Icon aria-hidden className="text-muted-foreground size-4" />
          ) : (
            <span className="text-muted-foreground text-data font-mono">
              {label}
            </span>
          )}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className={PANEL_SHAPE}>{children}</SelectContent>
    </Select>
  );
}

export function ZoneSelect({
  value,
  zones,
  onChange,
  inline = false,
  className,
}: {
  value: string | null;
  zones: ZoneFilterGroup[];
  onChange: (zone: string | null) => void;
  inline?: boolean;
  className?: string;
}) {
  const items = (
    <>
      <SelectItem value={ANY}>Toda la isla</SelectItem>
      {zones.map((zone) => (
        <SelectGroup key={zone.slug}>
          <SelectItem value={zone.slug}>{zone.name}</SelectItem>
          {zone.cities.length > 0 && (
            <>
              <SelectLabel>{zone.name} · municipios</SelectLabel>
              {zone.cities.map((city) => (
                <SelectItem key={city.slug} value={city.slug}>
                  {city.name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectGroup>
      ))}
    </>
  );

  const handle = (next: string) => onChange(next === ANY ? null : next);

  if (inline) {
    return (
      <InlineSelect
        label="provincia"
        value={value ?? ANY}
        onValueChange={handle}
        className={className}
      >
        {items}
      </InlineSelect>
    );
  }

  return (
    <Select value={value ?? ANY} onValueChange={handle}>
      <SelectTrigger aria-label="Provincia" className={cn(CONTROL_SHAPE, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={PANEL_SHAPE}>{items}</SelectContent>
    </Select>
  );
}

export function SupplierSelect({
  value,
  suppliers,
  onChange,
  inline = false,
  className,
}: {
  value: string | null;
  suppliers: { name: string; slug: string }[];
  onChange: (supplier: string | null) => void;
  inline?: boolean;
  className?: string;
}) {
  const items = (
    <>
      <SelectItem value={ANY}>Todos</SelectItem>
      {suppliers.map((supplier) => (
        <SelectItem key={supplier.slug} value={supplier.slug}>
          {supplier.name}
        </SelectItem>
      ))}
    </>
  );

  const handle = (next: string) => onChange(next === ANY ? null : next);

  if (inline) {
    return (
      <InlineSelect
        label="proveedor"
        value={value ?? ANY}
        onValueChange={handle}
        disabled={suppliers.length === 0}
        className={className}
      >
        {items}
      </InlineSelect>
    );
  }

  return (
    <Select value={value ?? ANY} onValueChange={handle}>
      <SelectTrigger
        aria-label="Proveedor"
        disabled={suppliers.length === 0}
        className={cn(CONTROL_SHAPE, className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={PANEL_SHAPE}>{items}</SelectContent>
    </Select>
  );
}

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "suggested", label: "Sugerido" },
  { value: "price-asc", label: "Más barato primero" },
  { value: "price-desc", label: "Más caro primero" },
];

export function SortSelect({
  value,
  onChange,
  inline = false,
  className,
}: {
  value: CatalogSort;
  onChange: (sort: CatalogSort) => void;
  inline?: boolean;
  className?: string;
}) {
  const items = SORT_OPTIONS.map((option) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  ));

  const handle = (next: string) => onChange(next as CatalogSort);

  if (inline) {
    return (
      <InlineSelect
        label="Orden"
        icon={Sort}
        value={value}
        onValueChange={handle}
        className={className}
      >
        {items}
      </InlineSelect>
    );
  }

  return (
    <Select value={value} onValueChange={handle}>
      <SelectTrigger aria-label="Orden" className={cn(CONTROL_SHAPE, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={PANEL_SHAPE}>{items}</SelectContent>
    </Select>
  );
}

/**
 * El rango no se aplica a cada tecla: se escriben los extremos y se manda con
 * Enter o al salir del campo. Reescribir la URL en cada dígito dispararía una
 * consulta por carácter y llenaría el historial de estados intermedios.
 */
export function PriceRange({
  minUsd,
  maxUsd,
  onChange,
  className,
}: {
  minUsd: number | null;
  maxUsd: number | null;
  onChange: (range: { minUsd: number | null; maxUsd: number | null }) => void;
  className?: string;
}) {
  const [min, setMin] = useState(minUsd?.toString() ?? "");
  const [max, setMax] = useState(maxUsd?.toString() ?? "");

  function toNumber(value: string): number | null {
    const parsed = Number(value.trim());
    return value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : null;
  }

  function commit() {
    const next = { minUsd: toNumber(min), maxUsd: toNumber(max) };
    if (next.minUsd !== minUsd || next.maxUsd !== maxUsd) onChange(next);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
      // `blur` burbujea en React, así que un `onBlur` a secas aquí también se
      // dispara al saltar de "desde" a "hasta" con el tabulador — y mandaba una
      // navegación con el rango a medio escribir, que es justo lo que este
      // control quería evitar. Solo cuenta salir del formulario entero.
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        commit();
      }}
      // Los dos campos se reparten el ancho que les dé quien los coloca: fijo
      // en la barra, a todo lo ancho dentro del panel lateral.
      className={cn("flex items-center gap-2", className)}
    >
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={10}
        value={min}
        onChange={(event) => setMin(event.target.value)}
        aria-label="Precio mínimo en dólares"
        placeholder="desde"
        className={cn(CONTROL_SHAPE, "min-w-0 flex-1")}
      />
      <span aria-hidden className="text-muted-foreground text-body-sm">
        –
      </span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={10}
        value={max}
        onChange={(event) => setMax(event.target.value)}
        aria-label="Precio máximo en dólares"
        placeholder="hasta"
        className={cn(CONTROL_SHAPE, "min-w-0 flex-1")}
      />
      {/* Sin botón: el submit existe para que Enter funcione, pero el cambio se
          manda solo al salir del campo. */}
      <button type="submit" className="sr-only">
        Aplicar precio
      </button>
    </form>
  );
}

// ─── Filtros puestos ─────────────────────────────────────────────────────────

function priceLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatUsd(min)} – ${formatUsd(max)}`;
  if (min !== null) return `desde ${formatUsd(min)}`;
  return `hasta ${formatUsd(max ?? 0)}`;
}

function zoneLabel(slug: string, zones: ZoneFilterGroup[]): string {
  for (const zone of zones) {
    if (zone.slug === slug) return zone.name;
    const city = zone.cities.find((c) => c.slug === slug);
    if (city) return city.name;
  }
  return slug;
}

/**
 * Lo que está filtrado, en fichas que se quitan de una en una. Es lo que hace
 * legible esconder los controles: se ve qué hay puesto sin abrir nada.
 */
export function ActiveFilterChips({
  filters,
  zones,
  suppliers,
  apply,
  className,
}: Pick<CatalogFiltersProps, "filters" | "zones" | "suppliers"> & {
  apply: ApplyFilters;
  className?: string;
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.zone) {
    chips.push({
      key: "zone",
      label: zoneLabel(filters.zone, zones),
      clear: () => apply({ zone: null, supplier: null }),
    });
  }
  if (filters.supplier) {
    chips.push({
      key: "supplier",
      label:
        suppliers.find((s) => s.slug === filters.supplier)?.name ??
        filters.supplier,
      clear: () => apply({ supplier: null }),
    });
  }
  if (filters.minUsd !== null || filters.maxUsd !== null) {
    chips.push({
      key: "price",
      label: priceLabel(filters.minUsd, filters.maxUsd),
      clear: () => apply({ minUsd: null, maxUsd: null }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.clear}
            className="border-border-strong text-muted-foreground hover:border-foreground hover:text-foreground text-marginalia tracking-mono-sm ease-standard flex h-8 items-center gap-1.5 border px-3 font-mono uppercase transition-colors duration-base"
          >
            {chip.label}
            <span aria-hidden>×</span>
            <span className="sr-only">Quitar filtro</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick}>
      Limpiar filtros
    </Button>
  );
}
