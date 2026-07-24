import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { getSuppliersWithZones } from "@/lib/suppliers/queries";
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

export const metadata = { title: "Proveedores — Solaris Admin" };
export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  await verifyAdmin();
  const suppliers = await getSuppliersWithZones();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="text-muted-foreground">
            Los proveedores los registra el admin; no hay auto-registro.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/proveedores/nuevo">Nuevo proveedor</Link>
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay proveedores. Crea el primero con «Nuevo proveedor».
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Cobertura</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link
                    href={`/admin/proveedores/${s.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[s.email, s.phone].filter(Boolean).join(" · ") || "—"}
                </TableCell>
                <TableCell>
                  {s.zones.length === 0 ? (
                    <span className="text-muted-foreground">Sin zonas</span>
                  ) : (
                    <div className="flex max-w-md flex-wrap gap-1">
                      {s.zones.map((z) => (
                        <Badge key={z.zoneId} variant="secondary">
                          {z.zoneName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={s.active ? "default" : "outline"}>
                    {s.active ? "Activo" : "Inactivo"}
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
