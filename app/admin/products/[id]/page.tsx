import { notFound } from "next/navigation";
import * as z from "zod";
import { verifyAdmin } from "@/lib/dal";
import { deleteProduct } from "@/app/actions/products";
import { specsToText } from "@/lib/forms";
import { getProduct } from "@/lib/products/queries";
import { getSupplierOptions } from "@/lib/suppliers/queries";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Editar producto — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();

  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [product, suppliers] = await Promise.all([
    getProduct(id.data),
    getSupplierOptions(),
  ]);
  if (!product) notFound();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <AdminDeleteButton
          action={deleteProduct}
          id={product.id}
          label="Eliminar producto"
          confirmMessage={`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`}
        />
      </div>
      <ProductForm
        product={{
          id: product.id,
          supplierId: product.supplierId,
          name: product.name,
          description: product.description,
          specsText: specsToText(product.specs),
          priceUsd: product.priceUsd,
          stock: product.stock,
          images: product.images,
          active: product.active,
        }}
        suppliers={suppliers}
      />
    </div>
  );
}
