import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await verifyAdmin();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/admin" className="font-semibold">
              Solaris Admin
            </Link>
            <Link href="/admin/zones" className="text-muted-foreground hover:text-foreground">
              Zonas
            </Link>
            <Link
              href="/admin/suppliers"
              className="text-muted-foreground hover:text-foreground"
            >
              Proveedores
            </Link>
            <Link
              href="/admin/products"
              className="text-muted-foreground hover:text-foreground"
            >
              Productos
            </Link>
            <Link href="/admin/kits" className="text-muted-foreground hover:text-foreground">
              Kits
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 py-8">{children}</main>
    </div>
  );
}
