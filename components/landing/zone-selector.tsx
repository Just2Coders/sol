import { getProvinceCoverage } from "@/lib/zones/coverage";
import { CubaMap } from "./cuba-map";
import { Reveal } from "./reveal";

/**
 * "¿Llegamos a tu provincia?" — el filtro central del producto, con el peso que
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
      <Reveal className="max-w-[52ch]">
        <h2 className="text-foreground text-display-2">
          ¿Llegamos a tu provincia?
        </h2>
        <p className="text-muted-foreground text-body-lg mt-5">
          Cada proveedor instala solo donde tiene equipo. Marca tu provincia y
          verás quién puede llegar hasta tu casa.
        </p>
      </Reveal>

      <div className="mt-12">
        <CubaMap coverage={coverage} />
      </div>
    </section>
  );
}
