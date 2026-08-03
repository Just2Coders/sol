import { notFound } from "next/navigation";
import * as z from "zod";
import { verifyAdmin } from "@/lib/dal";
import { deleteService } from "@/app/actions/services";
import { getService } from "@/lib/services/queries";
import { getServiceCategoryOptions } from "@/lib/service-categories/queries";
import { getSupplierOptions } from "@/lib/suppliers/queries";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { ServiceForm } from "@/components/admin/service-form";

export const metadata = { title: "Editar servicio — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();

  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [service, suppliers, categories] = await Promise.all([
    getService(id.data),
    getSupplierOptions(),
    getServiceCategoryOptions(),
  ]);
  if (!service) notFound();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{service.name}</h1>
        <AdminDeleteButton
          action={deleteService}
          id={service.id}
          label="Eliminar servicio"
          confirmMessage={`¿Eliminar "${service.name}"? Se quitará también de las fichas donde se ofrece. Esta acción no se puede deshacer.`}
        />
      </div>
      <ServiceForm
        service={{
          id: service.id,
          supplierId: service.supplierId,
          categoryId: service.categoryId,
          name: service.name,
          description: service.description,
          pricing: service.pricing,
          priceUsd: service.priceUsd,
          unitLabel: service.unitLabel,
          equipmentScope: service.equipmentScope,
          images: service.images,
          active: service.active,
        }}
        suppliers={suppliers}
        categories={categories}
      />
    </div>
  );
}
