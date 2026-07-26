import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { getKitsWithItems, sumItemsUsd } from "@/lib/kits/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Kits — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function KitsPage() {
  await verifyAdmin();
  const kits = await getKitsWithItems();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kits</h1>
          <p className="text-muted-foreground">
            Combos de productos de un mismo proveedor, con precio propio.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/kits/nuevo">Nuevo kit</Link>
        </Button>
      </div>

      {kits.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay kits. Crea el primero con «Nuevo kit».
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Incluye</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.map((kit) => {
              const componentsUsd = sumItemsUsd(kit.items);
              const saving = componentsUsd - kit.priceUsd;

              return (
                <TableRow key={kit.id}>
                  <TableCell>
                    <Link
                      href={`/admin/kits/${kit.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {kit.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {kit.supplierName}
                  </TableCell>
                  <TableCell>
                    {kit.items.length === 0 ? (
                      <span className="text-destructive">Sin productos</span>
                    ) : (
                      <div className="flex max-w-md flex-wrap gap-1">
                        {kit.items.map((item) => (
                          <Badge key={item.productId} variant="secondary">
                            {item.quantity}× {item.productName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    ${kit.priceUsd.toFixed(2)}
                    {saving > 0 && (
                      <span className="text-muted-foreground block text-xs">
                        ahorra ${saving.toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={kit.active ? "default" : "outline"}>
                      {kit.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
