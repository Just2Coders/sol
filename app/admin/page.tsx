import { verifyAdmin } from "@/lib/dal";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata = { title: "Panel admin — Solaris" };

export default async function AdminPage() {
  await verifyAdmin();

  return (
    <main className="mx-auto grid max-w-4xl gap-6 p-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel de administración</h1>
        <LogoutButton />
      </div>
      <p className="text-muted-foreground">
        Aquí irán proveedores, zonas, productos, kits y pagos (Etapas 3, 4 y 7).
      </p>
    </main>
  );
}
