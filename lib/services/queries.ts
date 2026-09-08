import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { installationOffers, kits, products, services } from "@/lib/db/schema";

export type Service = typeof services.$inferSelect;

export type ServiceWithRefs = Service & {
  supplierName: string;
  categoryName: string;
};

/**
 * Listado del panel admin: lo ve todo, activo o no.
 *
 * Se separa de `lib/catalog/queries.ts` por la misma razón que productos y kits
 * (ver ARCHITECTURE §3): el catálogo público solo enseña lo activo de
 * proveedores activos y filtrado por zona, y meter banderas en una sola consulta
 * para servir a los dos acaba sirviendo mal a ambos.
 */
export async function getServicesWithRefs(): Promise<ServiceWithRefs[]> {
  const rows = await db.query.services.findMany({
    with: {
      supplier: { columns: { name: true } },
      category: { columns: { name: true } },
    },
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  return rows.map(({ supplier, category, ...service }) => ({
    ...service,
    supplierName: supplier.name,
    categoryName: category.name,
  }));
}

export async function getService(id: string): Promise<Service | null> {
  const service = await db.query.services.findFirst({
    where: eq(services.id, id),
  });
  return service ?? null;
}

/**
 * ¿Este servicio está ofrecido sobre el equipo de **otro** proveedor?
 *
 * Es la pregunta que cierra el paso de un alcance abierto a `OWN`: si ya hay
 * ofertas cargadas contra items ajenos, cerrarlo dejaría en el catálogo filas
 * que no se podrían cumplir. `targetId` es una FK blanda —apunta a `products` o
 * a `kits` según `targetType`—, así que hay que mirar las dos tablas.
 */
export async function hasForeignOffers(
  serviceId: string,
  supplierId: string,
): Promise<boolean> {
  const [onProducts, onKits] = await Promise.all([
    db
      .select({ id: installationOffers.targetId })
      .from(installationOffers)
      .innerJoin(products, eq(products.id, installationOffers.targetId))
      .where(
        and(
          eq(installationOffers.serviceId, serviceId),
          eq(installationOffers.targetType, "PRODUCT"),
          ne(products.supplierId, supplierId),
        ),
      )
      .limit(1),
    db
      .select({ id: installationOffers.targetId })
      .from(installationOffers)
      .innerJoin(kits, eq(kits.id, installationOffers.targetId))
      .where(
        and(
          eq(installationOffers.serviceId, serviceId),
          eq(installationOffers.targetType, "KIT"),
          ne(kits.supplierId, supplierId),
        ),
      )
      .limit(1),
  ]);

  return onProducts.length > 0 || onKits.length > 0;
}

/** Una oferta tal como la guarda la tabla: el par que identifica al equipo. */
export type ServiceOffer = {
  targetType: "PRODUCT" | "KIT";
  targetId: string;
};

/** Sobre qué equipos se ofrece hoy este servicio. Rellena las casillas marcadas. */
export async function getServiceOffers(serviceId: string): Promise<ServiceOffer[]> {
  return db
    .select({
      targetType: installationOffers.targetType,
      targetId: installationOffers.targetId,
    })
    .from(installationOffers)
    .where(eq(installationOffers.serviceId, serviceId));
}

export type InstallableTarget = {
  type: "PRODUCT" | "KIT";
  id: string;
  name: string;
  /** Un item inactivo se sigue enseñando: hay que poder quitarle una oferta. */
  active: boolean;
};

export type InstallableGroup = {
  supplierId: string;
  supplierName: string;
  targets: InstallableTarget[];
};

/**
 * Todo lo que se puede instalar, agrupado por quién lo vende.
 *
 * Es el universo del selector de ofertas, y viene entero **a propósito**: qué
 * subconjunto puede elegir cada servicio depende de su alcance —`OWN` solo su
 * proveedor, los otros dos cualquiera— y eso cambia en el mismo formulario, así
 * que recortarlo en el servidor obligaría a volver a él en cada cambio. Quien
 * decide de verdad es la Action, que revalida lo que llegue.
 *
 * Los kits van antes que los productos dentro de cada proveedor, el mismo orden
 * "sugerido" que usa el catálogo: es lo que la casa compra.
 *
 * _Límite conocido:_ con muchos proveedores esto es una lista larga. Cuando
 * llegue ese día toca buscador y no otra consulta — la forma del dato no cambia.
 */
export async function getInstallableTargets(): Promise<InstallableGroup[]> {
  const rows = await db.query.suppliers.findMany({
    columns: { id: true, name: true },
    with: {
      products: { columns: { id: true, name: true, active: true } },
      kits: { columns: { id: true, name: true, active: true } },
    },
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  const byName = (a: InstallableTarget, b: InstallableTarget) =>
    a.name.localeCompare(b.name);

  return rows
    .map((supplier) => ({
      supplierId: supplier.id,
      supplierName: supplier.name,
      targets: [
        ...supplier.kits
          .map((kit): InstallableTarget => ({ type: "KIT", ...kit }))
          .sort(byName),
        ...supplier.products
          .map((product): InstallableTarget => ({ type: "PRODUCT", ...product }))
          .sort(byName),
      ],
    }))
    .filter((group) => group.targets.length > 0);
}
