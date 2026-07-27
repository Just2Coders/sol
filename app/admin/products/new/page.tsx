import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { getSupplierOptions } from "@/lib/suppliers/queries";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Nuevo producto — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await verifyAdmin();
  const suppliers = await getSupplierOptions();

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      {suppliers.length === 0 ? (
        <p className="text-muted-foreground">
          Necesitas al menos un proveedor.{" "}
          <Link
            href="/admin/suppliers/new"
            className="underline underline-offset-4"
          >
            Crea el primero
          </Link>
          .
        </p>
      ) : (
        <ProductForm suppliers={suppliers} />
      )}
    </div>
  );
}
