import { RevealFooter } from "@/components/landing/footer/reveal-footer";
import { SiteFooterMap } from "@/components/landing/footer/site-footer-map";
import { Hero } from "@/components/landing/hero";
import { KitComparison } from "@/components/landing/kit-comparison";
import { SiteHeader } from "@/components/landing/site-header";
import { SupplierCtaBand } from "@/components/landing/supplier-cta/supplier-cta-band";
import { ZoneSelector } from "@/components/landing/zone-selector";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    // El pie va fuera de <main>: es del documento, no del contenido principal.
    // El body es flex-col, así que se apila igual.
    <>
      {/*
        La cortina. Es lo único que el efecto de pie le pide a la página: fondo
        opaco (si no, se le ve el pie por debajo a media altura), un escalón por
        encima en el apilado, y la sombra que vende que esto está *sobre*
        aquello. El header sigue por encima de todo: es `fixed` con z-50 dentro
        de esta capa, así que sube con ella.
      */}
      <main className="bg-background relative z-10 flex-1 shadow-lg">
        <SiteHeader session={session} overHero />
        <Hero />
        <ZoneSelector />
        <KitComparison />
        <SupplierCtaBand />
      </main>
      <RevealFooter>
        <SiteFooterMap />
      </RevealFooter>
    </>
  );
}
