import { getProvinceCoverage } from "@/lib/zones/coverage";
import { FlatCta } from "../flat-cta";

/**
 * La banda de proveedores.
 *
 * La página entera está escrita para el que compra; esta sección le habla a
 * otro, y abre con un dato en vez de una pregunta: la cifra de provincias con
 * cobertura hoy, la misma fuente que pinta el mapa de `ZoneSelector`. Un
 * número así de grande no necesita caja ni fondo aparte para pesar — por eso
 * la sección vive a sangre en el lienzo oscuro, sin más adorno que el tamaño.
 *
 * Aquí solo se convence: el alta se rellena en `/sell`. El formulario vivía
 * dentro, desplegable, y creció hasta pedir su propio sitio — una sección de
 * la home no es donde se llena un impreso. Al salir se llevó el único estado
 * de cliente que había, así que esto vuelve a ser un componente de servidor
 * entero.
 */
export async function SupplierCtaBand() {
  const coverage = await getProvinceCoverage();
  const coveredCount = coverage.filter((zone) => zone.supplierCount > 0).length;

  return (
    <section
      id="supplier"
      aria-labelledby="supplier-band-title"
      className="bg-canvas px-gutter py-section-md flex scroll-mt-8 flex-col items-center"
    >
      <div className="flex w-full max-w-190 flex-col items-center gap-6 text-center">
        <p className="text-label tracking-mono-lg text-canvas-foreground/70 font-mono uppercase">
          para quien vende
        </p>

        <h2
          id="supplier-band-title"
          className="text-canvas-foreground flex flex-col items-center gap-2"
        >
          <span className="text-stat block">{coveredCount}</span>
          <span className="text-display-2 block max-w-[18ch]">
            provincias donde tu kit puede venderse mañana.
          </span>
        </h2>

        <p className="text-body text-canvas-foreground">
          Solaris no vende paneles: te pone delante de quien los busca.
          Publicas tus kits, decides en qué provincias instalas — el cobro y
          la factura los llevamos nosotros.
        </p>

        <FlatCta href="/sell" tone="loud" size="lg" className="mt-2.5">
          Quiero vender en Solaris
        </FlatCta>

        <p className="text-marginalia tracking-mono-xs text-canvas-foreground font-mono">
          el alta la hacemos a mano, una por una
        </p>
      </div>
    </section>
  );
}
