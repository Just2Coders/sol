import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { getProductsWithSupplier } from "@/lib/products/queries";
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

export const metadata = { title: "Productos — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  await verifyAdmin();
  const products = await getProductsWithSupplier();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-muted-foreground">
            Paneles, inversores, baterías y accesorios de cada proveedor.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/productos/nuevo">Nuevo producto</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay productos. Crea el primero con «Nuevo producto».
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.supplierName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${p.priceUsd.toFixed(2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.stock === 0 ? (
                    <span className="text-destructive">Sin stock</span>
                  ) : (
                    p.stock
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={p.active ? "default" : "outline"}>
                    {p.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
