import { RevealFooter } from "@/components/landing/footer/reveal-footer";
import { SiteFooterBleed } from "@/components/landing/footer/site-footer-bleed";
import { SiteHeader } from "@/components/landing/site-header";
import { SupplierApplicationForm } from "@/components/landing/supplier-cta/supplier-application-form";
import { getSession } from "@/lib/session";
import { getProvinceCoverage } from "@/lib/zones/coverage";

export const metadata = {
  title: "Vender en Solaris — alta de proveedor",
  description:
    "Publica tus kits solares en Solaris y véndelos en tu provincia. El catálogo, el cobro y la factura los llevamos nosotros.",
};

/**
 * El alta de proveedor.
 *
 * Sale de la home: la banda "¿Y si el proveedor eres tú?" era un argumento con
 * un formulario desplegable dentro, y el formulario ha crecido hasta pedir su
 * propio sitio. Ahora la banda solo convence y enlaza; aquí se rellena.
 *
 * La columna izquierda repite el argumento en corto porque a esta página se
 * puede llegar directo —del header, del pie o de un enlace compartido— sin
 * haber pasado por la home.
 */
export default async function SellPage() {
  const [session, coverage] = await Promise.all([
    getSession(),
    getProvinceCoverage(),
  ]);
  const coveredCount = coverage.filter((zone) => zone.supplierCount > 0).length;

  return (
    <>
      {/* `min-h-svh` es lo que mantiene el pie fuera de la primera pantalla.
          Sin él la cortina solo mide lo que ocupa el impreso —bastante menos
          que la ventana—, y como el efecto de pie reserva su hueco justo
          debajo, el zócalo con el logotipo asomaba antes de tocar el scroll.
          Va en `svh` y no en `vh`: en móvil el `vh` cuenta con la barra del
          navegador retraída, así que con la barra a la vista se colaba igual. */}
      <main className="bg-background relative z-10 min-h-svh flex-1 shadow-lg">
        <SiteHeader session={session} />

        <section className="px-gutter py-section-md">
          <div className="gap-grid grid lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-muted-foreground text-marginalia font-mono">
                alta de proveedor
              </p>
              <h1 className="text-foreground text-display-2 mt-4 max-w-[18ch]">
                Vende tus kits sin montar la tienda.
              </h1>
              <p className="text-muted-foreground text-body-lg mt-5 max-w-[46ch]">
                Solaris no vende paneles: te pone delante de quien los busca.
                Hoy hay {coveredCount} provincias con proveedor y el resto
                están libres.
              </p>

              {/* El reparto, que es lo único que un proveedor necesita saber
                  antes de dejar sus datos: qué pone él y qué ponemos nosotros. */}
              <dl className="border-border mt-10 max-w-[46ch] border-t">
                <SplitRow
                  term="tú"
                  detail="Pones el equipo, la instalación y decides en qué provincias trabajas."
                />
                <SplitRow
                  term="nosotros"
                  detail="El catálogo, el filtro por provincia, el cobro, la factura y el cliente."
                />
              </dl>

              <p className="text-muted-foreground text-marginalia mt-8 font-mono">
                el alta la hacemos a mano, una por una
              </p>
            </div>

            <div className="mt-14 lg:mt-0 lg:pl-grid">
              <SupplierApplicationForm />
            </div>
          </div>
        </section>
      </main>

      <RevealFooter>
        <SiteFooterBleed />
      </RevealFooter>
    </>
  );
}

/** Una fila del reparto: el rótulo mono a la izquierda, la letra a la derecha. */
function SplitRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="border-border grid gap-1 border-b py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6">
      <dt className="text-foreground text-marginalia font-mono">{term}</dt>
      <dd className="text-foreground text-body-sm">{detail}</dd>
    </div>
  );
}
