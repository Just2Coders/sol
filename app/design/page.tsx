import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exploraciones de landing · Solaris",
};

const VARIANTS = [
  {
    href: "/design/terroir",
    code: "A",
    name: "Terroir",
    decision:
      "El terracota deja de ser el botón y pasa a ser la tinta: titulares, cuerpo, datos y filetes van todos en él, y el rol foreground no aparece en toda la variante. Sin display: el techo es 32 px en caja alta, y lo que sostiene la página son el tracking y las cinco superficies.",
    risk: "Sin salto de tamaño ni color de acción aislado, la jerarquía descansa entera en el ritmo de fondos. Quien entre a media página no tiene nada que le grite dónde está la acción.",
  },
  {
    href: "/design/workshop",
    code: "B",
    name: "Taller",
    decision:
      "Todo neutro y un solo naranja hipersaturado (primary-loud) racionado al CTA y al chip del kit marcado; en ningún otro sitio. El fondo cambia en cada frontera de sección y la escala está congelada: hero a 68 px, todos los titulares a 44.",
    risk: "Con cinco fondos y un naranja de ese volumen, la página se parece más a un taller gráfico que a un sitio donde se gastan $2,760. La calidez de la marca se paga en frialdad.",
  },
  {
    href: "/design/media",
    code: "C",
    name: "Media",
    decision:
      "El color se reparte por función: el cuerpo se queda en el casi negro y todo lo demás —titulares, cifras, precios, rótulos— se va a terracota. Escala intermedia (68 / 40) y la anatomía de ficha de Chapitre dentro de la contención de Dix Hectares.",
    risk: "Por definición no tiene el gesto extremo de las otras dos. Si se ejecuta sin nervio, es la que se puede confundir con la landing de siempre, mejor peinada.",
  },
  {
    href: "/design/bois-franc",
    code: "D",
    name: "Bois-Franc",
    decision:
      "La más literal a la referencia: casi negro en todo el cuerpo, un solo naranja hipersaturado racionado al CTA y al chip del kit marcado, y el hero pintado encima de la foto con scrim en vez de separado de ella. El verde canvas que ya usa la home real para proveedores se extiende también al pie y a un FAQ nuevo, de acordeón de verdad.",
    risk: "Con dos secciones seguidas en el mismo lienzo oscuro (proveedores, FAQ y pie), la página cierra en un bloque largo de un solo color. Es la decisión de la home real hoy, no un descuido — pero aquí dura tres secciones en vez de una.",
  },
];

/**
 * Índice del banco de exploraciones. Existe para poder saltar entre las tres
 * variantes y para dejar escrito, al lado de cada una, qué decisión la define y
 * qué se está arriesgando al tomarla — que es lo que hay que discutir, no el
 * gusto por el color.
 */
export default function DesignIndexPage() {
  return (
    <main className="bg-background px-gutter py-section-md min-h-screen">
      <p className="text-marginalia text-muted-foreground font-mono">
        banco de exploraciones · no es la home
      </p>
      <h1 className="text-display-2 text-foreground mt-4 max-w-[18ch]">
        Cuatro landings, cuatro apuestas.
      </h1>
      <p className="text-body-lg text-muted-foreground mt-5 max-w-[60ch]">
        Las cuatro llevan la misma copy de producción y las mismas correcciones
        obligatorias: radio 0, CTA ancho y bajo en caja alta, sección de
        confianza, fotografía en el comparador, algo que cruce el gutter y
        ninguna sección contigua con el mismo fondo. Lo que cambia es la
        retícula, la escala tipográfica y dónde vive el color.
      </p>

      <ul className="mt-16 flex flex-col gap-px">
        {VARIANTS.map((variant) => (
          <li key={variant.href}>
            <Link
              href={variant.href}
              className="border-border hover:bg-muted ease-standard grid grid-cols-1 gap-6 border-t py-10 transition-colors duration-base md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] md:gap-12"
            >
              <p className="text-heading-1 text-primary md:w-24">
                {variant.code}
                <span className="text-marginalia text-muted-foreground mt-2 block font-mono">
                  {variant.name}
                </span>
              </p>

              <div>
                <p className="text-marginalia text-muted-foreground font-mono">
                  la decisión
                </p>
                <p className="text-body-sm text-foreground mt-3">{variant.decision}</p>
              </div>

              <div>
                <p className="text-marginalia text-muted-foreground font-mono">
                  el riesgo
                </p>
                <p className="text-body-sm text-muted-foreground mt-3">{variant.risk}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-marginalia text-muted-foreground border-border mt-16 border-t pt-6 font-mono">
        la sección de confianza lleva contenido marcador rotulado con corchetes ·
        el formulario de proveedores todavía no envía nada
      </p>

      <Link
        href="/"
        className="text-body-sm text-primary mt-10 inline-block underline underline-offset-4"
      >
        ← Volver a la home actual
      </Link>
    </main>
  );
}
