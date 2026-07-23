import Link from "next/link";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Solaris ☀️</h1>
      <p className="max-w-md text-muted-foreground">
        Paneles solares y kits de energía de proveedores en tu zona.
        El catálogo llega en la Etapa 5.
      </p>
      <div className="flex gap-3">
        {session ? (
          <>
            <Button asChild>
              <Link href="/cuenta">Mi cuenta</Link>
            </Button>
            {session.role === "ADMIN" && (
              <Button asChild variant="outline">
                <Link href="/admin">Panel admin</Link>
              </Button>
            )}
          </>
        ) : (
          <>
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
