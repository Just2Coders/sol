import { cn } from "@/lib/utils";
import { getProvinceCoverage } from "@/lib/zones/coverage";
import { CUBA_PROVINCES, CUBA_VIEW_BOX } from "../cuba-geometry";
import { GapLeadForm } from "./gap-lead-form";

/**
 * VARIANTE C — "El hueco del mapa".
 *
 * El argumento no lo pone la redacción, lo pone el dato: el mismo mapa de la
 * sección de zonas, pero leído al revés —encendidas las provincias donde no
 * hay nadie instalando—. Al proveedor no se le pide que crea en la propuesta;
 * se le enseña el hueco que puede ocupar, con su nombre escrito debajo.
 *
 * Es la variante que solo puede existir en Solaris: cualquier otra landing
 * podría llevar la banda o el impreso, ninguna este mapa.
 */
export async function SupplierCtaGap() {
  const coverage = await getProvinceCoverage();
  const covered = new Set(
    coverage.filter((zone) => zone.supplierCount > 0).map((zone) => zone.slug),
  );
  const missing = CUBA_PROVINCES.filter(
    (province) => !covered.has(province.slug),
  );

  return (
    <section
      aria-labelledby="supplier-gap-title"
      className="bg-muted px-gutter py-section-md"
    >
      <div className="gap-grid grid lg:grid-cols-2 lg:items-center">
        <div>
          <h2
            id="supplier-gap-title"
            className="text-foreground text-display-2 max-w-[18ch]"
          >
            {headline(missing.length)}
          </h2>
          <p className="text-muted-foreground text-body-lg mt-5 max-w-[46ch]">
            {missing.length > 0
              ? "Ahí no hay quien instale. El que entre primero se queda con todo el que busque solar en su provincia."
              : "Ya llegamos a toda la isla, pero en casi todas las provincias hay un solo proveedor. Todavía cabes."}
          </p>

          <CoverageGapMap covered={covered} />

          {missing.length > 0 && (
            <p className="text-foreground text-marginalia mt-6 font-mono">
              {missing.map((province) => province.name).join(" · ")}
            </p>
          )}

          <ul className="text-muted-foreground text-marginalia mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono">
            <LegendItem swatch="bg-primary" label="sin proveedor" />
            <LegendItem swatch="bg-support" label="ya cubierta" />
          </ul>
        </div>

        <div className="lg:pl-grid">
          <GapLeadForm />
        </div>
      </div>
    </section>
  );
}

function headline(missingCount: number) {
  if (missingCount === 0) return "Cubrimos la isla, no la llenamos.";
  if (missingCount === 1) return "Queda 1 provincia sin proveedor.";
  return `Quedan ${missingCount} provincias sin proveedor.`;
}

/**
 * La silueta, sin interacción: aquí el mapa es una cifra dibujada, no un
 * selector. Por eso no lleva foco ni tooltip — el que decide algo en esta
 * sección lo decide en el formulario de al lado.
 */
function CoverageGapMap({ covered }: { covered: Set<string> }) {
  return (
    <svg
      viewBox={CUBA_VIEW_BOX}
      role="img"
      aria-label="Mapa de Cuba con las provincias sin proveedor marcadas"
      className="mt-10 w-full max-w-lg"
    >
      {CUBA_PROVINCES.map((province) => (
        <path
          key={province.slug}
          d={province.d}
          className={cn(
            "stroke-muted [stroke-linejoin:round] [stroke-width:1.2]",
            covered.has(province.slug) ? "fill-support" : "fill-primary",
          )}
        />
      ))}
    </svg>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={cn("size-[10px] shrink-0 rounded-xs", swatch)} />
      {label}
    </li>
  );
}
