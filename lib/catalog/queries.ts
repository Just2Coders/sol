import "server-only";
import { cache } from "react";
import {
  and,
  count,
  eq,
  exists,
  gte,
  inArray,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  installationOffers,
  kitItems,
  kits,
  products,
  serviceCategories,
  services,
  supplierZones,
  suppliers,
  zones,
} from "@/lib/db/schema";
import { sumItemsUsd, type KitItemDetail } from "@/lib/kits/queries";
import {
  CATALOG_PAGE_SIZE,
  type CatalogFilters,
  type CatalogSort,
  type CatalogType,
  type PurchasableType,
} from "./filters";

/**
 * Un colador por módulo, no uno por comparación. `String.prototype.localeCompare`
 * instancia un `Intl.Collator` en cada llamada, así que usarlo dentro de un
 * `sort()` construye N·log N coladores para tirarlos acto seguido. El listado
 * lo ordena Postgres; esto solo peina listas cortas (la cobertura de un
 * proveedor, las piezas de un kit).
 */
const collator = new Intl.Collator("es");

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
  /** Página servida (1-based), ya recortada a `pageCount`. */
  page: number;
  /** Total de páginas del tipo visible; 1 aunque no haya nada que mostrar. */
  pageCount: number;
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

/**
 * Los proveedores del ámbito — la lista que alimenta el selector, sin aplicar
 * el filtro de proveedor (si no, el selector se quedaría con una sola opción).
 */
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

/**
 * El ámbito, como condiciones sobre `suppliers` dentro de la propia query de
 * items.
 *
 * Antes esto era un viaje aparte: se traían los ids de los proveedores y se
 * mandaban de vuelta en un `IN (...)`. Resolverlo aquí ahorra un salto de red
 * completo —con Neon por HTTP cada salto es latencia real— y deja que la lista
 * de proveedores del selector se pida **en paralelo** con los items.
 */
function scopeConditions(
  zone: ResolvedZone | null,
  supplierSlug: string | null,
): SQL[] {
  const conditions: SQL[] = [eq(suppliers.active, true)];

  // El proveedor entra por slug, que es lo que trae la URL: así no hay que
  // resolver su id antes de poder preguntar por sus productos.
  if (supplierSlug) conditions.push(eq(suppliers.slug, supplierSlug));

  // Sin zona no se escribe ningún `IN (...)`. Mandar la lista entera de
  // proveedores para decir "todos" es peso muerto en el cable y le esconde el
  // índice a Postgres.
  if (zone) {
    conditions.push(
      exists(
        db
          .select({ ok: sql`1` })
          .from(supplierZones)
          .where(
            and(
              eq(supplierZones.supplierId, suppliers.id),
              inArray(supplierZones.zoneId, zone.ids),
            ),
          ),
      ),
    );
  }

  return conditions;
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
function kitSummary(components: number, pieces: number): string | null {
  if (components === 0) return null;
  const left = `${components} ${components === 1 ? "componente" : "componentes"}`;
  return `${left} · ${pieces} ${pieces === 1 ? "pieza" : "piezas"}`;
}

/**
 * La fila que devuelven las dos ramas del listado.
 *
 * Kits y productos se leen con la **misma** forma para poder unirlos en SQL
 * (`UNION ALL`) y que sea Postgres quien ordene, corte y pagine. Las columnas
 * que solo tiene un lado viajan neutras en el otro: un kit nunca tiene `specs`
 * y un producto nunca tiene piezas.
 */
type CatalogRow = {
  type: CatalogType;
  /** 0 = kit, 1 = producto. Es la primera clave del orden "sugerido". */
  rank: number;
  id: string;
  slug: string;
  name: string;
  /** `lower(name)`: el desempate del orden, insensible a mayúsculas. */
  sortName: string;
  priceUsd: number;
  image: string | null;
  supplierName: string;
  specs: Record<string, string>;
  componentCount: number;
  pieceCount: number;
  stock: number;
};

/**
 * Solo las columnas que dibuja una tarjeta.
 *
 * Nada de `description` (texto largo) ni del array de imágenes entero: la celda
 * enseña la primera foto y dos datos. Antes se traían las filas completas de
 * las dos tablas y se descartaba casi todo ya en Node.
 */
function kitQuery(filters: CatalogFilters, zone: ResolvedZone | null) {
  return db
    .select({
      type: sql<CatalogType>`'KIT'`.as("type"),
      rank: sql<number>`0`.as("rank"),
      id: kits.id,
      slug: kits.slug,
      name: kits.name,
      sortName: sql<string>`lower(${kits.name})`.as("sort_name"),
      priceUsd: kits.priceUsd,
      // Los arrays de Postgres empiezan en 1; fuera de rango da NULL, que es
      // justo el "todavía sin foto" que espera la tarjeta.
      image: sql<string | null>`${kits.images}[1]`.as("image"),
      // `name` ya lo ocupa el kit: sin este alias las dos columnas chocarían.
      supplierName: sql<string>`${suppliers.name}`.as("supplier_name"),
      specs: sql<Record<string, string>>`'{}'::jsonb`.as("specs"),
      componentCount: sql<number>`(select count(*)::int from ${kitItems} where ${kitItems.kitId} = ${kits.id})`.as(
        "component_count",
      ),
      pieceCount: sql<number>`(select coalesce(sum(${kitItems.quantity}), 0)::int from ${kitItems} where ${kitItems.kitId} = ${kits.id})`.as(
        "piece_count",
      ),
      // Un kit nunca se marca sin stock; la columna existe para cuadrar la unión.
      stock: sql<number>`1`.as("stock"),
    })
    .from(kits)
    .innerJoin(suppliers, eq(suppliers.id, kits.supplierId))
    .where(
      and(
        eq(kits.active, true),
        ...scopeConditions(zone, filters.supplier),
        ...priceConditions(kits.priceUsd, filters),
      ),
    );
}

function productQuery(filters: CatalogFilters, zone: ResolvedZone | null) {
  return db
    .select({
      type: sql<CatalogType>`'PRODUCT'`.as("type"),
      rank: sql<number>`1`.as("rank"),
      id: products.id,
      slug: products.slug,
      name: products.name,
      sortName: sql<string>`lower(${products.name})`.as("sort_name"),
      priceUsd: products.priceUsd,
      image: sql<string | null>`${products.images}[1]`.as("image"),
      supplierName: sql<string>`${suppliers.name}`.as("supplier_name"),
      specs: products.specs,
      componentCount: sql<number>`0`.as("component_count"),
      pieceCount: sql<number>`0`.as("piece_count"),
      stock: products.stock,
    })
    .from(products)
    .innerJoin(suppliers, eq(suppliers.id, products.supplierId))
    .where(
      and(
        eq(products.active, true),
        ...scopeConditions(zone, filters.supplier),
        ...priceConditions(products.priceUsd, filters),
      ),
    );
}

/**
 * El `ORDER BY` de un `UNION` solo puede nombrar columnas **de salida** —los
 * alias de arriba—, nunca `kits.price_usd`: por eso va como `sql` crudo y no
 * como `asc(columna)`, que drizzle renderizaría cualificado por tabla.
 *
 * El desempate por nombre lo hace la colación de la base, no `Intl`. Para
 * nombres de equipos (mayúsculas, números, alguna tilde) la diferencia no se
 * ve, y a cambio el orden y el corte ocurren en el mismo sitio.
 */
function orderClauses(sort: CatalogSort): SQL[] {
  switch (sort) {
    case "price-asc":
      return [sql`price_usd asc`, sql`sort_name asc`];
    case "price-desc":
      return [sql`price_usd desc`, sql`sort_name asc`];
    // Sugerido: los kits primero — es lo que la casa compra — y dentro de cada
    // grupo, del más barato al más caro.
    case "suggested":
      return [sql`rank asc`, sql`price_usd asc`, sql`sort_name asc`];
  }
}

/**
 * Una página del listado, ordenada y cortada por Postgres.
 *
 * Con el tipo filtrado se consulta **una sola** tabla: pedir kits ya no arrastra
 * la tabla de productos entera (el contador que la barra necesita sale de un
 * `count()`, no de traerse las filas).
 */
async function listItems(
  filters: CatalogFilters,
  zone: ResolvedZone | null,
): Promise<CatalogRow[]> {
  const order = orderClauses(filters.sort);
  const offset = (filters.page - 1) * CATALOG_PAGE_SIZE;

  if (filters.type === "KIT") {
    return kitQuery(filters, zone)
      .orderBy(...order)
      .limit(CATALOG_PAGE_SIZE)
      .offset(offset);
  }

  if (filters.type === "PRODUCT") {
    return productQuery(filters, zone)
      .orderBy(...order)
      .limit(CATALOG_PAGE_SIZE)
      .offset(offset);
  }

  return unionAll(kitQuery(filters, zone), productQuery(filters, zone))
    .orderBy(...order)
    .limit(CATALOG_PAGE_SIZE)
    .offset(offset);
}

/** Cuántos hay, sin traérselos. Alimenta el selector Todo · Kits · Productos. */
async function countKits(
  filters: CatalogFilters,
  zone: ResolvedZone | null,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(kits)
    .innerJoin(suppliers, eq(suppliers.id, kits.supplierId))
    .where(
      and(
        eq(kits.active, true),
        ...scopeConditions(zone, filters.supplier),
        ...priceConditions(kits.priceUsd, filters),
      ),
    );
  return row?.n ?? 0;
}

async function countProducts(
  filters: CatalogFilters,
  zone: ResolvedZone | null,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(products)
    .innerJoin(suppliers, eq(suppliers.id, products.supplierId))
    .where(
      and(
        eq(products.active, true),
        ...scopeConditions(zone, filters.supplier),
        ...priceConditions(products.priceUsd, filters),
      ),
    );
  return row?.n ?? 0;
}

function toItem(row: CatalogRow): CatalogItem {
  return {
    type: row.type,
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceUsd: row.priceUsd,
    image: row.image,
    supplierName: row.supplierName,
    summary:
      row.type === "KIT"
        ? kitSummary(row.componentCount, row.pieceCount)
        : specsSummary(row.specs),
    outOfStock: row.type === "PRODUCT" && row.stock === 0,
  };
}

/**
 * Una página del catálogo para unos filtros: items, conteos por tipo y
 * proveedores del ámbito.
 *
 * Solo hay **dos** niveles de espera. El primero resuelve la zona (hace falta
 * su nombre para el vacío y sus hijas para el ámbito); el segundo lanza a la
 * vez el listado, los dos contadores y la lista de proveedores, que ya no
 * dependen unos de otros.
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
    page: 1,
    pageCount: 1,
  };
  if (empty.unknownZone) return empty;

  const [scope, kitCount, productCount, rows] = await Promise.all([
    getSuppliersInScope(zone),
    countKits(filters, zone),
    countProducts(filters, zone),
    listItems(filters, zone),
  ]);

  const counts = {
    all: kitCount + productCount,
    KIT: kitCount,
    PRODUCT: productCount,
  };
  const total = filters.type ? counts[filters.type] : counts.all;

  return {
    items: rows.map(toItem),
    counts,
    suppliers: scope,
    zone: empty.zone,
    unknownZone: false,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
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

// ─── Instalación ofrecida desde una ficha ────────────────────────────────────

/** Cómo se cobra un servicio; espeja `servicePricing` del schema. */
export type ServicePricing = "FLAT" | "PER_UNIT";

/** Una instalación que se puede añadir a la compra desde la ficha de un item. */
export type CatalogInstallation = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceUsd: number;
  pricing: ServicePricing;
  /** La unidad que se multiplica en `PER_UNIT` ("panel"); `null` en `FLAT`. */
  unitLabel: string | null;
  /** Primera foto, para la línea del carrito; `null` si no hay ninguna. */
  image: string | null;
  categoryName: string;
};

/**
 * Las instalaciones que se ofrecen con un producto o un kit.
 *
 * Entra por **slug** y no por id a propósito: así no depende de la consulta del
 * item y las dos se piden a la vez (`Promise.all`). Pedirla por id serían dos
 * saltos en serie, y con Neon por HTTP cada salto es latencia real.
 *
 * `installation_offers.targetId` es una FK blanda —apunta a `products` o a
 * `kits` según `targetType`—, así que el join contra la tabla del item se escribe
 * a mano; drizzle no puede tejer una relación con dos destinos.
 *
 * El filtro por proveedor sigue puesto porque hoy un servicio solo puede
 * instalar lo que vende su propio proveedor. Deja de ser una regla del modelo en
 * cuanto exista `services.equipmentScope` (ver PLAN.md §Paso 2): entonces un
 * servicio abierto a equipo ajeno podrá ofrecerse aquí, y esta lista tendrá que
 * decir de quién es cada instalación — hoy se da por hecho que es del vendedor.
 */
async function getInstallationsFor(
  target: "PRODUCT" | "KIT",
  slug: string,
): Promise<CatalogInstallation[]> {
  const owner = target === "PRODUCT" ? products : kits;

  return db
    .select({
      id: services.id,
      slug: services.slug,
      name: services.name,
      description: services.description,
      priceUsd: services.priceUsd,
      pricing: services.pricing,
      unitLabel: services.unitLabel,
      // Los arrays de Postgres empiezan en 1; fuera de rango da NULL, que es el
      // "todavía sin foto" que espera la línea del carrito.
      image: sql<string | null>`${services.images}[1]`.as("image"),
      categoryName: serviceCategories.name,
    })
    .from(installationOffers)
    .innerJoin(services, eq(services.id, installationOffers.serviceId))
    .innerJoin(serviceCategories, eq(serviceCategories.id, services.categoryId))
    .innerJoin(owner, eq(owner.id, installationOffers.targetId))
    .where(
      and(
        eq(installationOffers.targetType, target),
        eq(owner.slug, slug),
        eq(owner.active, true),
        eq(services.active, true),
        eq(services.supplierId, owner.supplierId),
      ),
    )
    // El orden lo pone el admin en la categoría; el desempate, el nombre.
    .orderBy(serviceCategories.position, services.name);
}

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
  /** Instalaciones que este producto ofrece; vacío si no hay ninguna. */
  installations: CatalogInstallation[];
};

export type CatalogKitItem = KitItemDetail & {
  productSlug: string;
  /** Si el producto está inactivo se lista, pero sin enlazar a una ficha 404. */
  productActive: boolean;
  /** Las fotos del componente: cada una entra en la columna de la ficha del kit. */
  productImages: string[];
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
  /** Instalaciones que este kit ofrece; vacío si no hay ninguna. */
  installations: CatalogInstallation[];
};

/** Un servicio en su propia ficha: la instalación contratada sola. */
export type CatalogService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceUsd: number;
  pricing: ServicePricing;
  unitLabel: string | null;
  images: string[];
  categoryName: string;
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
      .sort((a, b) => collator.compare(a, b)),
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
  // Las dos lecturas son independientes: ninguna necesita el resultado de la
  // otra, así que salen juntas y la ficha espera una sola vez.
  const [row, installations] = await Promise.all([
    db.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.active, true)),
      with: { supplier: supplierWith },
    }),
    getInstallationsFor("PRODUCT", slug),
  ]);
  // Un producto de un proveedor dado de baja no se ofrece.
  if (!row || !row.supplier.active) return null;

  const { supplier, ...product } = row;
  return { ...product, installations, supplier: toCatalogSupplier(supplier) };
});

export const getCatalogKit = cache(async function getCatalogKit(
  slug: string,
): Promise<CatalogKit | null> {
  const [row, installations] = await Promise.all([
    db.query.kits.findFirst({
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
                images: true,
              },
            },
          },
        },
      },
    }),
    getInstallationsFor("KIT", slug),
  ]);
  if (!row || !row.supplier.active) return null;

  const { supplier, items, ...kit } = row;
  const detail: CatalogKitItem[] = items
    .map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      productActive: item.product.active,
      productImages: item.product.images,
      quantity: item.quantity,
      unitPriceUsd: item.product.priceUsd,
    }))
    .sort((a, b) => collator.compare(a.productName, b.productName));

  const itemsTotalUsd = sumItemsUsd(detail);
  return {
    ...kit,
    items: detail,
    installations,
    itemsTotalUsd,
    savingsUsd: Math.max(
      0,
      Math.round((itemsTotalUsd - kit.priceUsd) * 100) / 100,
    ),
    supplier: toCatalogSupplier(supplier),
  };
});

/**
 * Un servicio por su slug: la instalación contratada **sola**, sin comprar el
 * equipo. Es la misma fila que ofrece la ficha de un producto o un kit; aquí se
 * lee con su categoría y la cobertura del proveedor, que es lo que decide si la
 * instalación llega a donde vive el visitante.
 */
export const getCatalogService = cache(async function getCatalogService(
  slug: string,
): Promise<CatalogService | null> {
  const row = await db.query.services.findFirst({
    where: and(eq(services.slug, slug), eq(services.active, true)),
    with: {
      supplier: supplierWith,
      category: { columns: { name: true } },
    },
  });
  if (!row || !row.supplier.active) return null;

  const { supplier, category, ...service } = row;
  return {
    ...service,
    categoryName: category.name,
    supplier: toCatalogSupplier(supplier),
  };
});

// ─── Más de este proveedor ───────────────────────────────────────────────────

/** Una pieza de la tira de relacionados: lo justo que dibuja una miniatura. */
export type CatalogRelated = {
  type: CatalogType;
  slug: string;
  name: string;
  priceUsd: number;
  /** Primera foto, o `null` si el proveedor aún no cargó ninguna. */
  image: string | null;
};

/**
 * Lo demás que vende el proveedor de la ficha abierta.
 *
 * Del **mismo** proveedor y no del catálogo entero. Ya no es porque sea lo único
 * que cabe en el carrito —un pedido admite varios proveedores—, sino porque es
 * lo que de verdad viene a cuento: quien está mirando un panel de esta marca es
 * mucho más probable que quiera su inversor y su batería, del mismo que ya se
 * ganó su atención, que un producto suelto del otro extremo del catálogo.
 *
 * Sin filtro de zona a propósito: la cobertura es del proveedor, así que si el
 * visitante llegó hasta esta ficha, todo lo de esta tira le llega igual.
 *
 * El orden espeja el "sugerido" del listado —kits primero, luego de más barato
 * a más caro— para que la tira no invente una jerarquía que el catálogo no
 * tiene. El corte lo hace Postgres.
 */
export const getSupplierRelated = cache(async function getSupplierRelated(
  supplierSlug: string,
  /** La ficha abierta, que no puede sugerirse a sí misma. */
  current: { type: PurchasableType; slug: string },
  limit = 4,
): Promise<CatalogRelated[]> {
  const ofSupplier = and(
    eq(suppliers.slug, supplierSlug),
    eq(suppliers.active, true),
  );

  const relatedKits = db
    .select({
      type: sql<CatalogType>`'KIT'`.as("type"),
      rank: sql<number>`0`.as("rank"),
      slug: kits.slug,
      name: kits.name,
      sortName: sql<string>`lower(${kits.name})`.as("sort_name"),
      priceUsd: kits.priceUsd,
      image: sql<string | null>`${kits.images}[1]`.as("image"),
    })
    .from(kits)
    .innerJoin(suppliers, eq(suppliers.id, kits.supplierId))
    .where(
      and(
        eq(kits.active, true),
        ofSupplier,
        current.type === "KIT" ? ne(kits.slug, current.slug) : undefined,
      ),
    );

  const relatedProducts = db
    .select({
      type: sql<CatalogType>`'PRODUCT'`.as("type"),
      rank: sql<number>`1`.as("rank"),
      slug: products.slug,
      name: products.name,
      sortName: sql<string>`lower(${products.name})`.as("sort_name"),
      priceUsd: products.priceUsd,
      image: sql<string | null>`${products.images}[1]`.as("image"),
    })
    .from(products)
    .innerJoin(suppliers, eq(suppliers.id, products.supplierId))
    .where(
      and(
        eq(products.active, true),
        ofSupplier,
        current.type === "PRODUCT" ? ne(products.slug, current.slug) : undefined,
      ),
    );

  const rows = await unionAll(relatedKits, relatedProducts)
    .orderBy(sql`rank asc`, sql`price_usd asc`, sql`sort_name asc`)
    .limit(limit);

  return rows.map((row) => ({
    type: row.type,
    slug: row.slug,
    name: row.name,
    priceUsd: row.priceUsd,
    image: row.image,
  }));
});
