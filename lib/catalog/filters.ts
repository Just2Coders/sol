import * as z from "zod";

/**
 * Filtros del catálogo público.
 *
 * Viven en la URL (no en estado de cliente): así una búsqueda se puede
 * compartir, el botón atrás funciona y la página se sigue renderizando en el
 * servidor. Este módulo es la única traducción entre los query params crudos y
 * el tipo `CatalogFilters` que consumen la query y la UI — no toca la BD ni
 * `next/headers`, por eso lo pueden importar cliente y servidor.
 */

/** Un item del catálogo es un kit armado o un producto suelto. */
export const CATALOG_TYPES = ["KIT", "PRODUCT"] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number];

export const CATALOG_SORTS = ["suggested", "price-asc", "price-desc"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** Orden por defecto: primero los kits (es lo que se compra), luego precio. */
export const DEFAULT_SORT: CatalogSort = "suggested";

export type CatalogFilters = {
  /** Slug de la zona; `null` = toda la isla. */
  zone: string | null;
  /** Slug del proveedor; `null` = todos los del ámbito. */
  supplier: string | null;
  /** `null` = kits y productos mezclados. */
  type: CatalogType | null;
  minUsd: number | null;
  maxUsd: number | null;
  sort: CatalogSort;
};

export const EMPTY_FILTERS: CatalogFilters = {
  zone: null,
  supplier: null,
  type: null,
  minUsd: null,
  maxUsd: null,
  sort: DEFAULT_SORT,
};

// Un valor de la URL nunca es de fiar: cada campo se valida y, si no cuadra,
// se cae al valor neutro en vez de romper la página.
const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
const typeSchema = z.enum(CATALOG_TYPES);
const sortSchema = z.enum(CATALOG_SORTS);
const moneySchema = z
  .string()
  .transform((value) => Number(value))
  .refine((n) => Number.isFinite(n) && n >= 0 && n <= 1_000_000);

export type RawSearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T | null {
  if (value === undefined || value === null) return null;
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Lee los filtros de los query params.
 *
 * `fallbackZone` es la zona que el visitante ya eligió antes (cookie): solo
 * aplica cuando la URL no dice nada de zona. Al limpiar el filtro la UI borra
 * también la cookie, así que "sin zona en la URL" nunca resucita una vieja.
 */
export function parseCatalogFilters(
  params: RawSearchParams,
  fallbackZone?: string | null,
): CatalogFilters {
  return {
    zone: parse(slugSchema, one(params.zone) ?? fallbackZone ?? undefined),
    supplier: parse(slugSchema, one(params.supplier)),
    type: parse(typeSchema, one(params.type)?.toUpperCase()),
    minUsd: parse(moneySchema, one(params.min)),
    maxUsd: parse(moneySchema, one(params.max)),
    sort: parse(sortSchema, one(params.sort)) ?? DEFAULT_SORT,
  };
}

/** Los filtros de vuelta a query params: los neutros no se escriben. */
export function catalogSearchParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.zone) params.set("zone", filters.zone);
  if (filters.supplier) params.set("supplier", filters.supplier);
  if (filters.type) params.set("type", filters.type.toLowerCase());
  if (filters.minUsd !== null) params.set("min", String(filters.minUsd));
  if (filters.maxUsd !== null) params.set("max", String(filters.maxUsd));
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  return params;
}

export function catalogHref(filters: CatalogFilters): string {
  const query = catalogSearchParams(filters).toString();
  return query ? `/catalog?${query}` : "/catalog";
}

/** La ficha de un item: kits y productos tienen su propia rama de la ruta. */
export function catalogItemHref(type: CatalogType, slug: string): string {
  return type === "KIT" ? `/catalog/kits/${slug}` : `/catalog/products/${slug}`;
}

/** ¿Hay algo que limpiar? La zona no cuenta: es el ámbito, no un filtro. */
export function hasNarrowingFilters(filters: CatalogFilters): boolean {
  return (
    filters.supplier !== null ||
    filters.type !== null ||
    filters.minUsd !== null ||
    filters.maxUsd !== null ||
    filters.sort !== DEFAULT_SORT
  );
}
