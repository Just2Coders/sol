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
      <main className="flex-1">
        <SiteHeader session={session} overHero />
        <Hero />
        <ZoneSelector />
        <KitComparison />
        <SupplierCtaBand />
      </main>
      <SiteFooterMap />
    </>
  );
}
