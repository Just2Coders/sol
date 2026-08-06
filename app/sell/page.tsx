import Link from "next/link";
import { ArrowLeft } from "reicon-react";

import { RevealFooter } from "@/components/landing/footer/reveal-footer";
import { SiteFooterBleed } from "@/components/landing/footer/site-footer-bleed";
import { SellBrandPanel } from "@/components/landing/supplier-cta/sell-brand-panel";
import { SupplierApplicationForm } from "@/components/landing/supplier-cta/supplier-application-form";
import { getProvinceCoverage } from "@/lib/zones/coverage";

export const metadata = {
  title: "Vender en Solaris — alta de proveedor",
  description:
    "Publica tus kits solares en Solaris y véndelos en tu provincia. El catálogo, el cobro y la factura los llevamos nosotros.",
};

/**
 * El alta de proveedor.
 *
 * Panel partido: a la izquierda el argumento y la prueba —alcance, cobro
 * automático, cómo se paga— siempre a la vista (`SellBrandPanel`); a la
 * derecha, solo el formulario (`SupplierApplicationForm`). La página no
 * lleva la barra del sitio — es una puerta aparte, como `/signup` — así que
 * el enlace de vuelta al catálogo hace ese trabajo.
 */
export default async function SellPage() {
  const coverage = await getProvinceCoverage();
  const coveredCount = coverage.filter((zone) => zone.supplierCount > 0).length;

  return (
    <>
      {/* `min-h-svh` es lo que mantiene el pie fuera de la primera pantalla.
          Sin él la cortina solo mide lo que ocupa el panel —bastante menos
          que la ventana—, y como el efecto de pie reserva su hueco justo
          debajo, el zócalo con el logotipo asomaba antes de tocar el scroll.
          Va en `svh` y no en `vh`: en móvil el `vh` cuenta con la barra del
          navegador retraída, así que con la barra a la vista se colaba igual. */}
      <main className="bg-background relative z-10 flex min-h-svh flex-1 flex-col shadow-lg lg:flex-row">
        <SellBrandPanel coveredCount={coveredCount} />

        <div className="flex w-full flex-1 flex-col">
          <div className="border-border flex h-header-bar shrink-0 items-center border-b px-8 lg:px-12">
            <Link
              href="/catalog"
              className="text-muted-foreground hover:text-foreground text-label tracking-mono-md ease-standard flex items-center gap-2 font-mono uppercase transition-colors duration-base"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Volver al catálogo
            </Link>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 lg:px-12">
            <SupplierApplicationForm />
          </div>
        </div>
      </main>

      <RevealFooter>
        <SiteFooterBleed />
      </RevealFooter>
    </>
  );
}
