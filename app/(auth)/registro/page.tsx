import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { zones } from "@/lib/db/schema";
import { SignupForm, type ZoneOption } from "@/components/auth/signup-form";

export const metadata = { title: "Crear cuenta — Solaris" };

export default async function RegistroPage() {
  const states = await db.query.zones.findMany({
    where: isNull(zones.parentId),
    with: { children: true },
    orderBy: (z, { asc }) => [asc(z.name)],
  });

  const zoneTree: ZoneOption[] = states.map((state) => ({
    id: state.id,
    name: state.name,
    cities: state.children
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignupForm zoneTree={zoneTree} />
    </main>
  );
}
