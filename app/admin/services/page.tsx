import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { getServicesWithRefs } from "@/lib/services/queries";
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

export const metadata = { title: "Servicios — Solaris Admin" };
export const dynamic = "force-dynamic";

/** El alcance, en corto, para que quepa en una celda. */
const SCOPE_LABEL = {
  OWN: "Equipo propio",
  PLATFORM: "De cualquier proveedor",
  ANY: "Cualquiera",
} as const;

export default async function ServicesPage() {
  await verifyAdmin();
  const services = await getServicesWithRefs();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Servicios</h1>
          <p className="text-muted-foreground">
            Instalación y mantenimiento de cada proveedor, y sobre qué equipo
            aceptan trabajar.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/services/new">Nuevo servicio</Link>
        </Button>
      </div>

      {services.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay servicios. Crea el primero con «Nuevo servicio».
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Trabaja sobre</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link
                    href={`/admin/services/${s.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.supplierName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.categoryName}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${s.priceUsd.toFixed(2)}
                  {s.unitLabel && (
                    <span className="text-muted-foreground"> / {s.unitLabel}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={s.equipmentScope === "OWN" ? "outline" : "secondary"}>
                    {SCOPE_LABEL[s.equipmentScope]}
                  </Badge>
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
