import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { getProductOptionsBySupplier } from "@/lib/products/queries";
import { KitForm } from "@/components/admin/kit-form";

export const metadata = { title: "Nuevo kit — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function NuevoKitPage() {
  await verifyAdmin();
  const productsBySupplier = await getProductOptionsBySupplier();

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nuevo kit</h1>
      {productsBySupplier.length === 0 ? (
        <p className="text-muted-foreground">
          Un kit se arma con productos existentes.{" "}
          <Link
            href="/admin/productos/nuevo"
            className="underline underline-offset-4"
          >
            Crea el primero
          </Link>
          .
        </p>
      ) : (
        <KitForm productsBySupplier={productsBySupplier} />
      )}
    </div>
  );
}
