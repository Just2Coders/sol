import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";

export type Zone = typeof zones.$inferSelect;

export type ZoneTreeState = Zone & { children: Zone[] };

/** Un solo colador para todo el módulo — ver la nota en `lib/catalog/queries.ts`. */
const collator = new Intl.Collator("es");

/** Etiqueta de invalidación: la tocan las Actions de `app/actions/zones.ts`. */
export const ZONES_CACHE_TAG = "zones";

// Jerarquía completa estado → ciudades, ordenada alfabéticamente en ambos
// niveles. La usan el registro (selector de zona) y el panel admin.
export const getZoneTree = cache(async function getZoneTree(): Promise<
  ZoneTreeState[]
> {
  const states = await db.query.zones.findMany({
    where: isNull(zones.parentId),
    with: { children: true },
    orderBy: (z, { asc }) => [asc(z.name)],
  });

  return states.map((state) => ({
    ...state,
    children: [...state.children].sort((a, b) => collator.compare(a.name, b.name)),
  }));
});

export type ZoneFilterGroup = {
  name: string;
  slug: string;
  cities: { name: string; slug: string }[];
};

/**
 * La jerarquía por slug, para el filtro de zona del catálogo público.
 *
 * Se distingue de `getZoneOptions()` porque ahí la zona viaja por id (es un
 * campo de formulario) y aquí por slug (es parte de la URL).
 *
 * Va cacheada **entre** requests, no solo dentro de uno: las provincias de Cuba
 * no cambian, y el catálogo pedía este árbol entero en cada carga. La única
 * cosa que la invalida es un alta/baja de zona en el admin, que dispara
 * `revalidateTag(ZONES_CACHE_TAG)`; el `revalidate` de un día es solo la red de
 * seguridad por si alguien toca la tabla por fuera.
 *
 * `unstable_cache` está marcada como reemplazada por la directiva `use cache`
 * en Next 16, pero esa pide activar `cacheComponents` para toda la app —cambia
 * el modelo de render de cada ruta, no solo del catálogo—. Cuando se haga esa
 * migración, este es el primer sitio que se convierte.
 */
export const getZoneFilterOptions = unstable_cache(
  async function getZoneFilterOptions(): Promise<ZoneFilterGroup[]> {
    const states = await getZoneTree();
    return states.map((state) => ({
      name: state.name,
      slug: state.slug,
      cities: state.children.map((city) => ({
        name: city.name,
        slug: city.slug,
      })),
    }));
  },
  ["zone-filter-options"],
  { tags: [ZONES_CACHE_TAG], revalidate: 86_400 },
);

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
