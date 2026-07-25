import { Hero } from "@/components/landing/hero";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="flex-1">
      <Hero session={session} />
    </main>
  );
}
