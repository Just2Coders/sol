import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kits } from "@/lib/db/schema";

export type Kit = typeof kits.$inferSelect;

export type KitItemDetail = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceUsd: number;
};

export type KitWithItems = Kit & {
  supplierName: string;
  items: KitItemDetail[];
};

function toKitWithItems(row: {
  supplier: { name: string };
  items: { productId: string; quantity: number; product: { name: string; priceUsd: number } }[];
}): { supplierName: string; items: KitItemDetail[] } {
  return {
    supplierName: row.supplier.name,
    items: row.items
      .map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPriceUsd: item.product.priceUsd,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName)),
  };
}

export async function getKitsWithItems(): Promise<KitWithItems[]> {
  const rows = await db.query.kits.findMany({
    with: {
      supplier: { columns: { name: true } },
      items: { with: { product: { columns: { name: true, priceUsd: true } } } },
    },
    orderBy: (k, { asc }) => [asc(k.name)],
  });

  return rows.map(({ supplier, items, ...kit }) => ({
    ...kit,
    ...toKitWithItems({ supplier, items }),
  }));
}

export async function getKitWithItems(id: string): Promise<KitWithItems | null> {
  const row = await db.query.kits.findFirst({
    where: eq(kits.id, id),
    with: {
      supplier: { columns: { name: true } },
      items: { with: { product: { columns: { name: true, priceUsd: true } } } },
    },
  });
  if (!row) return null;

  const { supplier, items, ...kit } = row;
  return { ...kit, ...toKitWithItems({ supplier, items }) };
}

/** Suma de los productos sueltos: referencia para justificar el precio del kit. */
export function sumItemsUsd(items: KitItemDetail[]): number {
  const total = items.reduce(
    (acc, item) => acc + item.unitPriceUsd * item.quantity,
    0,
  );
  // Se redondea a centavos: el precio se guarda en numeric(10,2).
  return Math.round(total * 100) / 100;
}
