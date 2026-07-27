import { Hero } from "@/components/landing/hero";
import { SiteHeader } from "@/components/landing/site-header";
import { ZoneSelector } from "@/components/landing/zone-selector";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="flex-1">
      <SiteHeader session={session} overHero />
      <Hero />
      <ZoneSelector />
    </main>
  );
}
