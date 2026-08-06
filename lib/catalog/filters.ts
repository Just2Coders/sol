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

/**
 * Lo que el listado sabe filtrar: un kit armado, un producto suelto o una
 * instalación que se contrata sola.
 *
 * De los servicios **solo entran los `ANY`**: son los únicos que se pueden
 * contratar sin traer el equipo, así que son los únicos a los que tiene sentido
 * llegar desde una grilla. Los otros dos siguen teniendo ficha —la enlazan las
 * fichas de los equipos— pero no se anuncian sueltos. Ver PLAN.md, Etapa 5.
 */
export const CATALOG_TYPES = ["KIT", "PRODUCT", "SERVICE"] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number];

/**
 * Todo lo que puede ser una línea de carrito.
 *
 * Hoy coincide exactamente con `CATALOG_TYPES`, pero los dos nombres siguen
 * separados porque responden a preguntas distintas: uno es *qué se lista* y el
 * otro *qué se compra*. Coincidieron al entrar los servicios a la grilla, y
 * volverán a separarse en cuanto algo se pueda comprar sin salir en el listado
 * —o al revés—.
 */
export const PURCHASABLE_TYPES = CATALOG_TYPES;
export type PurchasableType = (typeof PURCHASABLE_TYPES)[number];

/** Los conteos que alimentan el selector: uno por tipo más el total. */
export type CatalogCounts = { all: number } & Record<CatalogType, number>;

export const CATALOG_SORTS = ["suggested", "price-asc", "price-desc"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

/** Orden por defecto: primero los kits (es lo que se compra), luego precio. */
export const DEFAULT_SORT: CatalogSort = "suggested";

/**
 * Cuántas celdas trae una página. El corte es de la query (`LIMIT`/`OFFSET`),
 * no del render: sin él una provincia con mil equipos mandaría las mil filas a
 * Node y las mil tarjetas al HTML.
 */
export const CATALOG_PAGE_SIZE = 48;

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
  /** Página 1-based. Cambiar cualquier otro filtro la devuelve a 1. */
  page: number;
};

export const EMPTY_FILTERS: CatalogFilters = {
  zone: null,
  supplier: null,
  type: null,
  minUsd: null,
  maxUsd: null,
  sort: DEFAULT_SORT,
  page: 1,
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
// El tope evita que `?page=99999999` se traduzca en un OFFSET absurdo.
const pageSchema = z
  .string()
  .transform((value) => Number(value))
  .refine((n) => Number.isInteger(n) && n >= 1 && n <= 10_000);

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
    page: parse(pageSchema, one(params.page)) ?? 1,
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
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function catalogHref(filters: CatalogFilters): string {
  const query = catalogSearchParams(filters).toString();
  return query ? `/catalog?${query}` : "/catalog";
}

/** La ficha de un item: cada tipo tiene su propia rama de la ruta. */
export function catalogItemHref(type: PurchasableType, slug: string): string {
  switch (type) {
    case "KIT":
      return `/catalog/kits/${slug}`;
    case "SERVICE":
      return `/catalog/services/${slug}`;
    case "PRODUCT":
      return `/catalog/products/${slug}`;
  }
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
