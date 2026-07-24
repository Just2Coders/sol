import { getZoneOptions } from "@/lib/zones/queries";
import { SignupForm } from "@/components/auth/signup-form";
import { safeInternalPath } from "@/lib/utils";

export const metadata = { title: "Crear cuenta — Solaris" };

// Las zonas se leen de la BD en cada request (son editables por el admin), así
// que la página se renderiza dinámicamente. Además, esto evita que el build
// requiera una base de datos viva para prerenderizar.
export const dynamic = "force-dynamic";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const redirectTo = safeInternalPath((await searchParams).desde) ?? undefined;
  const zoneTree = await getZoneOptions();

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignupForm zoneTree={zoneTree} redirectTo={redirectTo} />
    </main>
  );
}
