import "server-only";
import { cache } from "react";
import { and, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  kits,
  products,
  supplierZones,
  suppliers,
  zones,
} from "@/lib/db/schema";
import { sumItemsUsd, type KitItemDetail } from "@/lib/kits/queries";
import type { CatalogFilters, CatalogSort, CatalogType } from "./filters";

/**
 * Lecturas del catálogo público.
 *
 * Se separan de `lib/products/queries.ts` y `lib/kits/queries.ts` (que sirven al
 * panel admin) porque las reglas son otras: aquí solo se ve lo activo, de
 * proveedores activos, y filtrado por la zona donde el visitante instala. Los
 * kits y los productos se devuelven en un mismo tipo (`CatalogItem`) para que la
 * grilla no tenga que saber de cuál de las dos tablas viene cada tarjeta.
 */

/** Un proveedor tal como lo ve el catálogo: sin datos de liquidación. */
export type CatalogSupplier = { id: string; name: string; slug: string };

export type CatalogItem = {
  type: CatalogType;
  id: string;
  slug: string;
  name: string;
  priceUsd: number;
  /** Primera foto, o `null` si el proveedor aún no cargó ninguna. */
  image: string | null;
  supplierName: string;
  /** Línea corta que resume qué es: specs del producto o piezas del kit. */
  summary: string | null;
  /** Solo productos: sin unidades disponibles. */
  outOfStock: boolean;
};

export type CatalogResult = {
  /** Los items ya filtrados y ordenados. */
  items: CatalogItem[];
  /**
   * Conteos del ámbito (zona + proveedor + precio) **ignorando** el filtro de
   * tipo: son los números que muestra el selector Todo · Kits · Productos.
   */
  counts: { all: number; KIT: number; PRODUCT: number };
  /** Proveedores que operan en la zona elegida — alimenta el selector. */
  suppliers: CatalogSupplier[];
  /** La zona resuelta, o `null` si el catálogo se ve sin filtro de zona. */
  zone: { slug: string; name: string } | null;
  /** La URL pedía una zona que no existe: el catálogo sale vacío a propósito. */
  unknownZone: boolean;
};

// ─── Ámbito: zona → proveedores ──────────────────────────────────────────────

type ResolvedZone = { id: string; name: string; slug: string; ids: string[] };

/**
 * Una zona puede ser provincia o municipio. Filtrar por la provincia tiene que
 * traer también a los proveedores que solo cubren municipios suyos, así que el
 * ámbito es la zona más sus hijas.
 */
const resolveZone = cache(async function resolveZone(
  slug: string,
): Promise<ResolvedZone | null> {
  const zone = await db.query.zones.findFirst({
    where: eq(zones.slug, slug),
    columns: { id: true, name: true, slug: true },
    with: { children: { columns: { id: true } } },
  });
  if (!zone) return null;

  return {
    id: zone.id,
    name: zone.name,
    slug: zone.slug,
    ids: [zone.id, ...zone.children.map((child) => child.id)],
  };
});

async function getSuppliersInScope(
  zone: ResolvedZone | null,
): Promise<CatalogSupplier[]> {
  if (!zone) {
    return db.query.suppliers.findMany({
      columns: { id: true, name: true, slug: true },
      where: eq(suppliers.active, true),
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  }

  return db
    .selectDistinct({
      id: suppliers.id,
      name: suppliers.name,
      slug: suppliers.slug,
    })
    .from(suppliers)
    .innerJoin(supplierZones, eq(supplierZones.supplierId, suppliers.id))
    .where(
      and(eq(suppliers.active, true), inArray(supplierZones.zoneId, zone.ids)),
    )
    .orderBy(suppliers.name);
}

// ─── Listado ─────────────────────────────────────────────────────────────────

function priceConditions(
  column: typeof products.priceUsd | typeof kits.priceUsd,
  filters: CatalogFilters,
): SQL[] {
  const conditions: SQL[] = [];
  if (filters.minUsd !== null) conditions.push(gte(column, filters.minUsd));
  if (filters.maxUsd !== null) conditions.push(lte(column, filters.maxUsd));
  return conditions;
}

// "450W · Monocristalino": los dos primeros datos de la ficha técnica bastan
// para reconocer el producto en la tarjeta.
function specsSummary(specs: Record<string, string>): string | null {
  const values = Object.values(specs).filter(Boolean).slice(0, 2);
  return values.length > 0 ? values.join(" · ") : null;
}

// "3 componentes · 6 piezas": el desglose completo se ve en la página del kit.
function kitSummary(items: { quantity: number }[]): string | null {
  if (items.length === 0) return null;
  const pieces = items.reduce((total, item) => total + item.quantity, 0);
  const components = `${items.length} ${items.length === 1 ? "componente" : "componentes"}`;
  return `${components} · ${pieces} ${pieces === 1 ? "pieza" : "piezas"}`;
}

function sortItems(items: CatalogItem[], sort: CatalogSort): CatalogItem[] {
  const byName = (a: CatalogItem, b: CatalogItem) =>
    a.name.localeCompare(b.name);

  switch (sort) {
    case "price-asc":
      return items.sort((a, b) => a.priceUsd - b.priceUsd || byName(a, b));
    case "price-desc":
      return items.sort((a, b) => b.priceUsd - a.priceUsd || byName(a, b));
    // Sugerido: los kits primero — es lo que la casa compra — y dentro de cada
    // grupo, del más barato al más caro.
    case "suggested":
      return items.sort(
        (a, b) =>
          Number(a.type === "PRODUCT") - Number(b.type === "PRODUCT") ||
          a.priceUsd - b.priceUsd ||
          byName(a, b),
      );
  }
}

/**
 * El catálogo entero para unos filtros: items, conteos por tipo y proveedores
 * del ámbito. Sin paginación todavía: el volumen de la Fase 1 cabe de sobra en
 * una respuesta, y cuando no quepa el corte natural es aquí.
 */
export async function getCatalog(
  filters: CatalogFilters,
): Promise<CatalogResult> {
  const zone = filters.zone ? await resolveZone(filters.zone) : null;
  const empty: CatalogResult = {
    items: [],
    counts: { all: 0, KIT: 0, PRODUCT: 0 },
    suppliers: [],
    zone: zone && { slug: zone.slug, name: zone.name },
    unknownZone: filters.zone !== null && zone === null,
  };
  if (empty.unknownZone) return empty;

  const scope = await getSuppliersInScope(zone);
  const selected = filters.supplier
    ? scope.filter((supplier) => supplier.slug === filters.supplier)
    : scope;
  if (selected.length === 0) return { ...empty, suppliers: scope };

  const supplierIds = selected.map((supplier) => supplier.id);
  const [productRows, kitRows] = await Promise.all([
    db.query.products.findMany({
      where: and(
        eq(products.active, true),
        inArray(products.supplierId, supplierIds),
        ...priceConditions(products.priceUsd, filters),
      ),
      with: { supplier: { columns: { name: true } } },
    }),
    db.query.kits.findMany({
      where: and(
        eq(kits.active, true),
        inArray(kits.supplierId, supplierIds),
        ...priceConditions(kits.priceUsd, filters),
      ),
      with: {
        supplier: { columns: { name: true } },
        items: { columns: { quantity: true } },
      },
    }),
  ]);

  const items: CatalogItem[] = [
    ...kitRows.map((kit) => ({
      type: "KIT" as const,
      id: kit.id,
      slug: kit.slug,
      name: kit.name,
      priceUsd: kit.priceUsd,
      image: kit.images[0] ?? null,
      supplierName: kit.supplier.name,
      summary: kitSummary(kit.items),
      outOfStock: false,
    })),
    ...productRows.map((product) => ({
      type: "PRODUCT" as const,
      id: product.id,
      slug: product.slug,
      name: product.name,
      priceUsd: product.priceUsd,
      image: product.images[0] ?? null,
      supplierName: product.supplier.name,
      summary: specsSummary(product.specs),
      outOfStock: product.stock === 0,
    })),
  ];

  const visible = filters.type
    ? items.filter((item) => item.type === filters.type)
    : items;

  return {
    items: sortItems(visible, filters.sort),
    counts: {
      all: items.length,
      KIT: kitRows.length,
      PRODUCT: productRows.length,
    },
    suppliers: scope,
    zone: empty.zone,
    unknownZone: false,
  };
}

// ─── Detalle ─────────────────────────────────────────────────────────────────

/** El proveedor como se muestra en una ficha: nombre y dónde llega. Nunca su
 *  teléfono ni su info de liquidación — el trato pasa por la plataforma. */
export type CatalogItemSupplier = {
  name: string;
  slug: string;
  zoneNames: string[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  specs: Record<string, string>;
  priceUsd: number;
  stock: number;
  images: string[];
  supplier: CatalogItemSupplier;
};

export type CatalogKitItem = KitItemDetail & {
  productSlug: string;
  /** Si el producto está inactivo se lista, pero sin enlazar a una ficha 404. */
  productActive: boolean;
};

export type CatalogKit = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceUsd: number;
  images: string[];
  items: CatalogKitItem[];
  /** Lo que costaría comprar las piezas sueltas. */
  itemsTotalUsd: number;
  /** Diferencia a favor del kit; 0 si comprarlo suelto sale igual o mejor. */
  savingsUsd: number;
  supplier: CatalogItemSupplier;
};

type SupplierRow = {
  name: string;
  slug: string;
  active: boolean;
  zones: { zone: { name: string } }[];
};

function toCatalogSupplier(supplier: SupplierRow): CatalogItemSupplier {
  return {
    name: supplier.name,
    slug: supplier.slug,
    zoneNames: supplier.zones
      .map((sz) => sz.zone.name)
      .sort((a, b) => a.localeCompare(b)),
  };
}

// El proveedor con su cobertura: lo mismo para la ficha de producto y la de kit.
const supplierWith = {
  columns: { name: true, slug: true, active: true },
  with: { zones: { with: { zone: { columns: { name: true } } } } },
} as const;

/** `cache()` porque la piden dos veces por request: generateMetadata y la página. */
export const getCatalogProduct = cache(async function getCatalogProduct(
  slug: string,
): Promise<CatalogProduct | null> {
  const row = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.active, true)),
    with: { supplier: supplierWith },
  });
  // Un producto de un proveedor dado de baja no se ofrece.
  if (!row || !row.supplier.active) return null;

  const { supplier, ...product } = row;
  return { ...product, supplier: toCatalogSupplier(supplier) };
});

export const getCatalogKit = cache(async function getCatalogKit(
  slug: string,
): Promise<CatalogKit | null> {
  const row = await db.query.kits.findFirst({
    where: and(eq(kits.slug, slug), eq(kits.active, true)),
    with: {
      supplier: supplierWith,
      items: {
        with: {
          product: {
            columns: {
              name: true,
              slug: true,
              priceUsd: true,
              active: true,
            },
          },
        },
      },
    },
  });
  if (!row || !row.supplier.active) return null;

  const { supplier, items, ...kit } = row;
  const detail: CatalogKitItem[] = items
    .map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      productActive: item.product.active,
      quantity: item.quantity,
      unitPriceUsd: item.product.priceUsd,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const itemsTotalUsd = sumItemsUsd(detail);
  return {
    ...kit,
    items: detail,
    itemsTotalUsd,
    savingsUsd: Math.max(
      0,
      Math.round((itemsTotalUsd - kit.priceUsd) * 100) / 100,
    ),
    supplier: toCatalogSupplier(supplier),
  };
});
