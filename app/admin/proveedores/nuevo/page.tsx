import { verifyAdmin } from "@/lib/dal";
import { getZoneOptions } from "@/lib/zones/queries";
import { SupplierForm } from "@/components/admin/supplier-form";

export const metadata = { title: "Nuevo proveedor — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function NuevoProveedorPage() {
  await verifyAdmin();
  const zoneGroups = await getZoneOptions();

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nuevo proveedor</h1>
      <SupplierForm zoneGroups={zoneGroups} />
    </div>
  );
}
