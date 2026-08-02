import { Faq } from "@/components/landing/faq";
import { RevealFooter } from "@/components/landing/footer/reveal-footer";
import { SiteFooterBleed } from "@/components/landing/footer/site-footer-bleed";
import { Hero } from "@/components/landing/hero";
import { KitProviders } from "@/components/landing/kit-providers";
import { KitSelectionProvider } from "@/components/landing/kit-selection";
import { SiteHeader } from "@/components/landing/site-header";
import { SupplierCtaBand } from "@/components/landing/supplier-cta/supplier-cta-band";
import { Trust } from "@/components/landing/trust";
import { ZoneSelector } from "@/components/landing/zone-selector";
import { getKitComparison } from "@/lib/kits/comparison";
import { getKitOffers } from "@/lib/kits/offers";
import { getSession } from "@/lib/session";

/**
 * La home, en el orden en que se decide una compra: qué necesitas (hero y
 * buscador), quién te lo instala, dónde llega, de quién te fías, y solo al
 * final el otro interlocutor —el proveedor— y las dudas.
 *
 * Los kits y sus ofertas se leen aquí una sola vez y bajan por el contexto: el
 * buscador del hero y la sección de resultados son los dos extremos de la misma
 * elección, y están demasiado lejos en el documento para pasárselo por props.
 */
export default async function Home() {
  const [session, kits, offers] = await Promise.all([
    getSession(),
    getKitComparison(),
    getKitOffers(),
  ]);

  return (
    // El pie va fuera de <main>: es del documento, no del contenido principal.
    // El body es flex-col, así que se apila igual.
    <>
      {/*
        La cortina. Es lo único que el efecto de pie le pide a la página: fondo
        opaco (si no, se le ve el pie por debajo a media altura), un escalón por
        encima en el apilado, y la sombra que vende que esto está *sobre*
        aquello.
      */}
      <main className="bg-background relative z-10 flex-1 shadow-lg">
        <SiteHeader session={session} />
        <KitSelectionProvider kits={kits} offers={offers}>
          <Hero />
          <KitProviders />
        </KitSelectionProvider>
        <ZoneSelector />
        <Trust />
        <SupplierCtaBand />
        <Faq />
      </main>
      <RevealFooter>
        <SiteFooterBleed />
      </RevealFooter>
    </>
  );
}
