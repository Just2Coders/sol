import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { getServiceCategoryOptions } from "@/lib/service-categories/queries";
import { getSupplierOptions } from "@/lib/suppliers/queries";
import { ServiceForm } from "@/components/admin/service-form";

export const metadata = { title: "Nuevo servicio — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  await verifyAdmin();

  const [suppliers, categories] = await Promise.all([
    getSupplierOptions(),
    getServiceCategoryOptions(),
  ]);

  // Un servicio necesita las dos cosas, así que se dice cuál falta en vez de
  // enseñar un formulario con un select vacío.
  const missing =
    suppliers.length === 0
      ? { label: "un proveedor", href: "/admin/suppliers/new", cta: "Crea el primero" }
      : categories.length === 0
        ? {
            label: "una categoría de servicio",
            href: "/admin/service-categories",
            cta: "Crea la primera",
          }
        : null;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nuevo servicio</h1>
      {missing ? (
        <p className="text-muted-foreground">
          Necesitas al menos {missing.label}.{" "}
          <Link href={missing.href} className="underline underline-offset-4">
            {missing.cta}
          </Link>
          .
        </p>
      ) : (
        <ServiceForm suppliers={suppliers} categories={categories} />
      )}
    </div>
  );
}
