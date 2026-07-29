import { getProvinceCoverage } from "@/lib/zones/coverage";
import { CubaMap } from "./cuba-map";

/**
 * "¿Dónde instalas?" — el filtro central del producto, con el peso visual que
 * merece: la isla entera a todo el ancho, las provincias con proveedores en el
 * color de apoyo y las que faltan apagadas en la superficie muted.
 *
 * Comparte retícula con el hero: mismo margen lateral (px-gutter) y el titular
 * a sangre por la izquierda. El conteo de cobertura y la leyenda no van aquí:
 * viven dentro del mapa, en el hueco que deja el mar al noreste de la isla.
 */
export async function ZoneSelector() {
  const coverage = await getProvinceCoverage();

  return (
    <section className="px-gutter py-section-md">
      <div className="max-w-[52ch]">
        <h2 className="text-foreground text-display-2">¿Dónde instalas?</h2>
        <p className="text-muted-foreground text-body-lg mt-5">
          Cada proveedor trabaja su propio territorio. Marca tu provincia y te
          mostramos quién puede llegar hasta tu casa.
        </p>
      </div>

      <div className="mt-12">
        <CubaMap coverage={coverage} />
      </div>
    </section>
  );
}
