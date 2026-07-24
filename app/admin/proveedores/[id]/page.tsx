import { notFound } from "next/navigation";
import * as z from "zod";
import { verifyAdmin } from "@/lib/dal";
import { getSupplierWithZones } from "@/lib/suppliers/queries";
import { getZoneOptions } from "@/lib/zones/queries";
import { SupplierForm } from "@/components/admin/supplier-form";
import { SupplierDeleteButton } from "@/components/admin/supplier-delete-button";

export const metadata = { title: "Editar proveedor — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();

  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [supplier, zoneGroups] = await Promise.all([
    getSupplierWithZones(id.data),
    getZoneOptions(),
  ]);
  if (!supplier) notFound();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{supplier.name}</h1>
        <SupplierDeleteButton supplierId={supplier.id} supplierName={supplier.name} />
      </div>
      <SupplierForm
        supplier={{
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          logoUrl: supplier.logoUrl,
          notes: supplier.notes,
          payoutInfo: supplier.payoutInfo,
          active: supplier.active,
          zoneIds: supplier.zones.map((zn) => zn.zoneId),
        }}
        zoneGroups={zoneGroups}
      />
    </div>
  );
}
