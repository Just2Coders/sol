import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kits, products, suppliers } from "@/lib/db/schema";

export type Supplier = typeof suppliers.$inferSelect;

export type SupplierWithZones = Supplier & {
  zones: { zoneId: string; zoneName: string }[];
};

// Lista para el panel admin, con las zonas de cobertura resueltas a nombre.
export async function getSuppliersWithZones(): Promise<SupplierWithZones[]> {
  const rows = await db.query.suppliers.findMany({
    with: { zones: { with: { zone: true } } },
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  return rows.map(({ zones, ...supplier }) => ({
    ...supplier,
    zones: zones
      .map((sz) => ({ zoneId: sz.zoneId, zoneName: sz.zone.name }))
      .sort((a, b) => a.zoneName.localeCompare(b.zoneName)),
  }));
}

export type SupplierOption = {
  id: string;
  name: string;
  active: boolean;
  /**
   * Con qué alcance nacen sus servicios. Viaja aquí porque el formulario de
   * servicios lo usa para **prefijar** el select al elegir proveedor; ninguna
   * consulta lo lee para resolver qué se ofrece (eso sale siempre de la fila del
   * servicio). Ver ARCHITECTURE §4.
   */
  defaultEquipmentScope: "OWN" | "PLATFORM" | "ANY";
  /**
   * ¿Vende algo sobre lo que instalar? Un proveedor sin productos ni kits es un
   * **instalador puro**, y para él un servicio `OWN` no se podrá vender nunca:
   * no hay equipo propio al que pegarlo. El formulario lo avisa —no lo prohíbe,
   * puede estar a punto de cargar su catálogo—.
   */
  hasInstallables: boolean;
};

/**
 * Proveedores reducidos a lo que necesitan los selects de productos, kits y
 * servicios.
 *
 * `hasInstallables` sale de dos `selectDistinct` sobre la columna indexada y no
 * de una subconsulta correlacionada: escrita como `sql` dentro de un
 * `db.select()`, drizzle **quita la cualificación de tabla** cuando el `FROM`
 * tiene una sola —`${products.supplierId}` y `${suppliers.id}` acaban los dos
 * sin prefijo, y dentro del `exists` resuelven contra la tabla de dentro—. No
 * falla: devuelve `false` para todos. Es el mismo cuidado que ya pide `extras`
 * en la query relacional (ARCHITECTURE §3), y la versión de aquí es además
 * tipada y sin SQL a mano.
 *
 * Las tres van en paralelo: con Neon por HTTP, encadenarlas serían tres
 * latencias en vez de una.
 */
export async function getSupplierOptions(): Promise<SupplierOption[]> {
  const [rows, sellingProducts, sellingKits] = await Promise.all([
    db.query.suppliers.findMany({
      columns: { id: true, name: true, active: true, defaultEquipmentScope: true },
      orderBy: (s, { asc }) => [asc(s.name)],
    }),
    db.selectDistinct({ supplierId: products.supplierId }).from(products),
    db.selectDistinct({ supplierId: kits.supplierId }).from(kits),
  ]);

  const withCatalog = new Set([
    ...sellingProducts.map((row) => row.supplierId),
    ...sellingKits.map((row) => row.supplierId),
  ]);

  return rows.map((supplier) => ({
    ...supplier,
    hasInstallables: withCatalog.has(supplier.id),
  }));
}

export async function getSupplierWithZones(
  id: string,
): Promise<SupplierWithZones | null> {
  const row = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, id),
    with: { zones: { with: { zone: true } } },
  });
  if (!row) return null;

  const { zones, ...supplier } = row;
  return {
    ...supplier,
    zones: zones.map((sz) => ({ zoneId: sz.zoneId, zoneName: sz.zone.name })),
  };
}
