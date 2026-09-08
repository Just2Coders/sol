import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { serviceCategories, services } from "@/lib/db/schema";

export type ServiceCategory = typeof serviceCategories.$inferSelect;

export type ServiceCategoryWithCount = ServiceCategory & {
  /** Cuántos servicios la usan. Es lo que decide si se puede borrar. */
  serviceCount: number;
};

/**
 * Las categorías tal como las administra el admin.
 *
 * El orden es el que él mismo pone (`position`) y el desempate es el nombre —el
 * mismo par que usa el catálogo público al listar las instalaciones de una
 * ficha—, para que lo que ve aquí sea lo que verá el cliente.
 *
 * El conteo va en la misma consulta y no en una por fila: son pocas categorías,
 * pero una consulta por fila con Neon por HTTP es una latencia por fila.
 */
export async function getServiceCategories(): Promise<ServiceCategoryWithCount[]> {
  const rows = await db.query.serviceCategories.findMany({
    with: { services: { columns: { id: true } } },
    orderBy: (c, { asc }) => [asc(c.position), asc(c.name)],
  });

  return rows.map(({ services: used, ...category }) => ({
    ...category,
    serviceCount: used.length,
  }));
}

export type ServiceCategoryOption = { id: string; name: string };

/** Reducidas a {id, name} para el select del formulario de servicios. */
export async function getServiceCategoryOptions(): Promise<ServiceCategoryOption[]> {
  return db.query.serviceCategories.findMany({
    columns: { id: true, name: true },
    orderBy: (c, { asc }) => [asc(c.position), asc(c.name)],
  });
}

/** ¿Queda algún servicio colgando de esta categoría? Guarda del borrado. */
export async function categoryHasServices(id: string): Promise<boolean> {
  const used = await db.query.services.findFirst({
    where: eq(services.categoryId, id),
    columns: { id: true },
  });
  return used != null;
}
