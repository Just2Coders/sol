import Link from "next/link";
import { Clock, Fridge, TagPrice } from "reicon-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getKitComparison, type KitComparison } from "@/lib/kits/comparison";

// $1,450 — sin centavos: en la comparación estorban.
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** La listada de kits del catálogo, que es a donde lleva cada columna. */
const KITS_HREF = "/catalog?type=kit";

/** Un icono de Reicon, tal como lo consumen las filas. */
type RowIcon = React.ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
}>;

/**
 * Comparador rápido de kits.
 *
 * En escritorio es una tabla de verdad: las filas son las tres preguntas que
 * decide el cliente (qué mueve · cuánto aguanta · cuánto cuesta) y cada columna
 * un kit, para que se lean en horizontal sin volver atrás. El kit destacado no
 * grita: solo cambia de superficie y se queda con el único botón sólido.
 *
 * En móvil la tabla se vuelve tarjetas apiladas — nunca scroll horizontal.
 *
 * Cada fila se marca con un icono en vez de un rótulo: las tres preguntas son
 * las mismas siempre, así que el texto solo repetía ruido a la izquierda de los
 * datos. El rótulo sigue existiendo en `sr-only` — es el nombre accesible de la
 * fila, y sin él el icono no diría nada a un lector de pantalla.
 */
export async function KitComparison() {
  const kits = await getKitComparison();

  return (
    <section className="px-gutter py-section-md">
      <div className="max-w-[52ch]">
        <h2 className="text-foreground text-display-2">¿Cuál te hace falta?</h2>
        <p className="text-muted-foreground text-body-lg mt-5">
          Los tres llevan paneles, inversor, baterías e instalación. Lo que
          cambia es cuánto aguantan cuando se va la luz.
        </p>
      </div>

      <ComparisonTable kits={kits} />
      <ComparisonCards kits={kits} />
    </section>
  );
}

// ─── Escritorio ──────────────────────────────────────────────────────────────

// Las celdas de la columna destacada no llevan un fondo aparte: se pintan una a
// una y, al no haber gap entre ellas, la columna se lee como un solo bloque.
function cellClass(kit: KitComparison, extra?: string) {
  return cn("px-6 py-6 text-center", kit.highlight && "bg-muted", extra);
}

function ComparisonTable({ kits }: { kits: KitComparison[] }) {
  return (
    <div className="mt-14 hidden grid-cols-[auto_repeat(3,minmax(0,1fr))] md:grid">
      {/* Fila 1 — nombre del kit. Los nombres se alinean entre sí: la etiqueta
          del destacado crece hacia arriba, dentro de su propia celda. */}
      <div />
      {kits.map((kit) => (
        <div
          key={kit.slug}
          className={cellClass(kit, "flex flex-col justify-end gap-1")}
        >
          {kit.highlight && (
            <p className="text-emphasis text-marginalia font-mono">
              {kit.highlight}
            </p>
          )}
          <h3 className="text-foreground text-heading-2">{kit.name}</h3>
        </div>
      ))}

      {/* Fila 2 — qué mueve */}
      <RowLabel icon={Fridge} label="qué mueve" />
      {kits.map((kit) => (
        <div key={kit.slug} className={cellClass(kit, "border-border border-t")}>
          <p className="text-foreground text-body">{kit.moves}</p>
        </div>
      ))}

      {/* Fila 3 — cuánto aguanta */}
      <RowLabel icon={Clock} label="cuánto aguanta" />
      {kits.map((kit) => (
        <div key={kit.slug} className={cellClass(kit, "border-border border-t")}>
          <p className="text-muted-foreground text-data font-mono">
            {kit.backup} · {kit.capacityKwh} kWh
          </p>
        </div>
      ))}

      {/* Fila 4 — cuánto cuesta */}
      <RowLabel icon={TagPrice} label="cuánto cuesta" />
      {kits.map((kit) => (
        <div key={kit.slug} className={cellClass(kit, "border-border border-t")}>
          <p className="text-foreground text-heading-1">
            {usd.format(kit.priceUsd)}
          </p>
        </div>
      ))}

      {/* Fila 5 — acción */}
      <div />
      {kits.map((kit) => (
        <div key={kit.slug} className={cellClass(kit, "pb-8")}>
          <Button
            asChild
            size="lg"
            variant={kit.highlight ? "default" : "outline"}
            className="w-full"
          >
            <Link href={KITS_HREF}>Ver el {kit.name.toLowerCase()}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

function RowLabel({ icon: Icon, label }: { icon: RowIcon; label: string }) {
  return (
    <div className="border-border flex items-center border-t py-6 pr-10">
      <Icon aria-hidden className="text-muted-foreground size-5" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── Móvil ───────────────────────────────────────────────────────────────────

function ComparisonCards({ kits }: { kits: KitComparison[] }) {
  return (
    <ul className="mt-10 flex flex-col gap-4 md:hidden">
      {kits.map((kit) => (
        <li
          key={kit.slug}
          className={cn(
            "rounded-md border p-6",
            kit.highlight
              ? "bg-muted border-border-strong"
              : "bg-card border-border",
          )}
        >
          {kit.highlight && (
            <p className="text-emphasis text-marginalia font-mono">
              {kit.highlight}
            </p>
          )}
          <h3 className="text-foreground text-heading-2">{kit.name}</h3>

          <dl className="mt-5 flex flex-col gap-4">
            <CardRow icon={Fridge} label="qué mueve">
              <span className="text-foreground text-body">{kit.moves}</span>
            </CardRow>
            <CardRow icon={Clock} label="cuánto aguanta">
              <span className="text-muted-foreground text-data font-mono">
                {kit.backup} · {kit.capacityKwh} kWh
              </span>
            </CardRow>
            <CardRow icon={TagPrice} label="cuánto cuesta">
              <span className="text-foreground text-heading-2">
                {usd.format(kit.priceUsd)}
              </span>
            </CardRow>
          </dl>

          <Button
            asChild
            size="lg"
            variant={kit.highlight ? "default" : "outline"}
            className="mt-6 w-full"
          >
            <Link href={KITS_HREF}>Ver el {kit.name.toLowerCase()}</Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

// Sin rótulo que poner encima, el icono y el dato caben en la misma línea: el
// `pt-0.5` lo baja hasta la altura de x de la primera línea del valor.
function CardRow({
  icon: Icon,
  label,
  children,
}: {
  icon: RowIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <dt className="pt-0.5">
        <Icon aria-hidden className="text-muted-foreground size-4" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
