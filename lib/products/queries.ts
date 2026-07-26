import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export type Product = typeof products.$inferSelect;

export type ProductWithSupplier = Product & { supplierName: string };

// Listado del panel admin, con el proveedor resuelto a nombre.
export async function getProductsWithSupplier(): Promise<ProductWithSupplier[]> {
  const rows = await db.query.products.findMany({
    with: { supplier: { columns: { name: true } } },
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  return rows.map(({ supplier, ...product }) => ({
    ...product,
    supplierName: supplier.name,
  }));
}

export async function getProduct(id: string): Promise<Product | null> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
  });
  return product ?? null;
}

export type ProductOption = {
  id: string;
  name: string;
  priceUsd: number;
  active: boolean;
};

export type ProductOptionsBySupplier = {
  supplierId: string;
  supplierName: string;
  products: ProductOption[];
};

/**
 * Productos agrupados por proveedor, para armar kits.
 *
 * Un kit solo puede contener productos de su mismo proveedor (ver PLAN §Etapa 4),
 * por eso el formulario necesita la lista ya particionada.
 */
export async function getProductOptionsBySupplier(): Promise<
  ProductOptionsBySupplier[]
> {
  const rows = await db.query.products.findMany({
    with: { supplier: { columns: { id: true, name: true } } },
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  const bySupplier = new Map<string, ProductOptionsBySupplier>();
  for (const { supplier, ...product } of rows) {
    const group = bySupplier.get(supplier.id) ?? {
      supplierId: supplier.id,
      supplierName: supplier.name,
      products: [],
    };
    group.products.push({
      id: product.id,
      name: product.name,
      priceUsd: product.priceUsd,
      active: product.active,
    });
    bySupplier.set(supplier.id, group);
  }

  return [...bySupplier.values()].sort((a, b) =>
    a.supplierName.localeCompare(b.supplierName),
  );
}
