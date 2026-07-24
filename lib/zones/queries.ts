import "server-only";
import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";

export type Zone = typeof zones.$inferSelect;

export type ZoneTreeState = Zone & { children: Zone[] };

// Jerarquía completa estado → ciudades, ordenada alfabéticamente en ambos
// niveles. La usan el registro (selector de zona) y el panel admin.
export async function getZoneTree(): Promise<ZoneTreeState[]> {
  const states = await db.query.zones.findMany({
    where: isNull(zones.parentId),
    with: { children: true },
    orderBy: (z, { asc }) => [asc(z.name)],
  });

  return states.map((state) => ({
    ...state,
    children: [...state.children].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export type ZoneOptionGroup = {
  id: string;
  name: string;
  cities: { id: string; name: string }[];
};

// La jerarquía reducida a opciones {id, name} para selects y checkboxes
// (selector de zona del registro, cobertura de proveedores).
export async function getZoneOptions(): Promise<ZoneOptionGroup[]> {
  const states = await getZoneTree();
  return states.map((state) => ({
    id: state.id,
    name: state.name,
    cities: state.children.map((c) => ({ id: c.id, name: c.name })),
  }));
}
