import { catalogItemHref } from "@/lib/catalog/filters";
import type { KitComparison } from "@/lib/kits/comparison";
import { cn, formatUsd } from "@/lib/utils";
import { FlatCta, type CtaTone } from "./flat-cta";
import { PhotoSlot } from "./photo-slot";

/**
 * La ficha de kit con la anatomía de la referencia: foto arriba, barra oscura
 * con la marca y el nombre, y debajo una subbarra separada por filete con el
 * precio a la izquierda y las specs a la derecha.
 *
 * Lo que arregla respecto al comparador de hoy: la landing vende un objeto
 * físico de cuatro cifras sin enseñar ni uno, y la tabla actual pone toda la
 * carga en el texto. Aquí la foto es el 60 % de la ficha —aunque hoy sea un
 * hueco rotulado, ver `PhotoSlot`— y el precio deja de ser un titular suelto
 * para volverse un dato dentro de la ficha.
 *
 * El CTA lleva a la página del kit, no a un catálogo filtrado genérico: es la
 * única forma de que la etiqueta «Ver el kit casa» diga la verdad.
 * OJO: los slugs de `getKitComparison()` son MOCK y todavía no existen en la
 * BD, así que el enlace resuelve a 404 hasta que los kits reales estén
 * sembrados. El destino es el correcto; los datos, los que faltan.
 */

export type KitCardTone = {
  /** El hueco de foto: proporción, superficie y color del aspa. */
  photo: string;
  /** Barra del nombre. */
  bar: string;
  /** Chip de la marca ("para ti"): el único sitio, con el CTA, donde va el acento. */
  chip: string;
  /** Subbarra de precio y specs; va pegada a la barra, no debajo. */
  meta: string;
  /** El filete que separa las dos barras. */
  line: string;
  /** La línea de "qué mueve", ya fuera del bloque de cabecera. */
  body: string;
  cta: CtaTone;
};

export function KitCard({
  kit,
  tone,
  className,
}: {
  kit: KitComparison;
  tone: KitCardTone;
  className?: string;
}) {
  return (
    <article className={cn("flex flex-col", className)}>
      <PhotoSlot label={`[foto: ${kit.name.toLowerCase()}]`} className={tone.photo} />

      <div className={cn("flex items-center justify-between gap-4 px-5 py-4", tone.bar)}>
        <h3 className="text-heading-3">{kit.name}</h3>
        {kit.highlight && (
          <span className={cn("text-marginalia shrink-0 px-2 py-1 font-mono", tone.chip)}>
            {kit.highlight}
          </span>
        )}
      </div>

      <div
        className={cn(
          "text-marginalia flex items-baseline justify-between gap-4 border-t px-5 py-3 font-mono",
          tone.line,
          tone.meta,
        )}
      >
        <span>desde {formatUsd(kit.priceUsd)}</span>
        <span className="text-right">
          {kit.capacityKwh} kWh · {kit.backup}
        </span>
      </div>

      <p className={cn("text-body-sm mt-5 grow px-5", tone.body)}>{kit.moves}</p>

      <FlatCta
        href={catalogItemHref("KIT", kit.slug)}
        tone={tone.cta}
        className="mt-6 px-6"
      >
        Ver el {kit.name.toLowerCase()}
      </FlatCta>
    </article>
  );
}
