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
