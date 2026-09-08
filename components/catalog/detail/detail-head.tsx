import { TagPrice } from "reicon-react";

import { CatalogPurchaseBlock } from "@/components/catalog/detail/purchase-block";
import type { CartItem } from "@/lib/cart/lines";
import { formatUsd } from "@/lib/utils";

/**
 * La cabecera fija de la columna derecha: de quién es, qué es, cómo se llama,
 * cuánto cuesta y el botón de comprarlo.
 *
 * Identidad y compra van en un solo bloque —y no en dos secciones separadas por
 * una línea— porque son una sola cosa: lo que no se puede perder de vista.
 *
 * Es la región que el armazón clava arriba, pero **no** es la que hay que
 * apretar: con todo lo demás plegado en el acordeón, la columna ya cabe de un
 * vistazo y el alto sobra. Así que aquí se gasta: el nombre en `display-4`, el
 * precio en `heading-1` y aire de sobra entre los tres renglones. Lo que sí se
 * mantiene de la versión apretada es el botón compartiendo fila con el selector
 * —eso no era compresión, era mejor forma— y el estado en una tira de marginalia
 * en vez de tres párrafos apilados.
 *
 * - El precio va en su propio renglón y no al lado del nombre: los nombres de
 *   equipo son largos ("Panel Solar Monocristalino 450W") y compartir línea con
 *   la cifra los parte en tres.
 * - Nada lleva rótulo. Un nombre propio y un precio no necesitan que se les
 *   anuncie.
 *
 * `installations` (`CatalogInstallations`) cuelga justo debajo del botón de
 * compra y no en el acordeón: contratar la mano de obra es una decisión que
 * se toma en el mismo momento que comprar el equipo, así que tiene que estar
 * a la vista sin abrir nada.
 */
export function CatalogDetailHead({
  kind,
  supplierName,
  name,
  priceUsd,
  unitLabel,
  savingsUsd,
  item,
  note,
  purchase,
  installations,
}: {
  /** Qué es, en minúscula mono: "kit", "producto", "instalación · paneles". */
  kind: string;
  supplierName: string;
  name: string;
  priceUsd: number;
  /** Unidad de obra de un servicio `PER_UNIT`; `null` en todo lo demás. */
  unitLabel?: string | null;
  /** Ahorro frente a comprar las piezas sueltas; 0 o ausente si no hay. */
  savingsUsd?: number;
  /** Lo que se guarda en el carrito al pulsar el botón. */
  item: CartItem;
  /** Aclaración propia del tipo: cómo se cobra un servicio, por ejemplo. */
  note?: React.ReactNode;
  /**
   * Sustituye el bloque de compra por otro. Lo usa la ficha de un servicio, que
   * a veces no vende: si trabaja solo sobre cierto equipo, sin ese equipo
   * delante explica en vez de ofrecer un botón (`ServicePurchaseBlock`).
   */
  purchase?: React.ReactNode;
  /** La instalación que se puede contratar junto al equipo; `CatalogInstallations`. */
  installations?: React.ReactNode;
}) {
  return (
    <div className="lg:px-gutter px-6 pt-6 pb-9 lg:pt-8 lg:pb-12">
      <h1 className="text-foreground text-display-4 max-w-[28ch] text-balance">
        {name}
      </h1>

      <p className="text-muted-foreground text-marginalia mt-2 font-mono">
        {kind} · {supplierName}
      </p>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="text-foreground text-heading-1">
          {formatUsd(priceUsd)}
          {unitLabel && (
            <span className="text-muted-foreground text-data font-mono">
              {" "}
              / {unitLabel}
            </span>
          )}
        </p>

        {savingsUsd !== undefined && savingsUsd > 0 && (
          <p className="bg-success-bg text-success border-success-border text-marginalia inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono">
            <TagPrice className="size-3.5" aria-hidden />
            ahorras {formatUsd(savingsUsd)}
          </p>
        )}
      </div>

      <div className="mt-7">
        {purchase ?? <CatalogPurchaseBlock item={item} note={note} />}
      </div>

      {installations}
    </div>
  );
}
