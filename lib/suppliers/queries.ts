import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";

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
