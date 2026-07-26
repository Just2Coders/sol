import { notFound } from "next/navigation";
import * as z from "zod";
import { verifyAdmin } from "@/lib/dal";
import { deleteKit } from "@/app/actions/kits";
import { getKitWithItems, sumItemsUsd } from "@/lib/kits/queries";
import { getProductOptionsBySupplier } from "@/lib/products/queries";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { KitForm } from "@/components/admin/kit-form";

export const metadata = { title: "Editar kit — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function EditarKitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();

  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [kit, productsBySupplier] = await Promise.all([
    getKitWithItems(id.data),
    getProductOptionsBySupplier(),
  ]);
  if (!kit) notFound();

  const componentsUsd = sumItemsUsd(kit.items);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{kit.name}</h1>
          <p className="text-muted-foreground text-sm">
            Comprado por separado costaría ${componentsUsd.toFixed(2)}.
          </p>
        </div>
        <AdminDeleteButton
          action={deleteKit}
          id={kit.id}
          label="Eliminar kit"
          confirmMessage={`¿Eliminar "${kit.name}"? Esta acción no se puede deshacer.`}
        />
      </div>
      <KitForm
        kit={{
          id: kit.id,
          supplierId: kit.supplierId,
          name: kit.name,
          description: kit.description,
          priceUsd: kit.priceUsd,
          imagesText: kit.images.join("\n"),
          active: kit.active,
          items: kit.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }}
        productsBySupplier={productsBySupplier}
      />
    </div>
  );
}
