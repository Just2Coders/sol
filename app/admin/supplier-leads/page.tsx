import { verifyAdmin } from "@/lib/dal";
import { getSupplierLeads } from "@/lib/supplier-leads/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Solicitudes de alta — Solaris Admin" };
export const dynamic = "force-dynamic";

/**
 * Fecha y hora en una celda. La hora importa: dos solicitudes del mismo día se
 * atienden en el orden en que entraron.
 */
const WHEN = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Quién ha pedido vender en Solaris.
 *
 * Es la otra mitad de `/sell`: ese formulario escribe en `supplier_leads` desde
 * hace tiempo y hasta ahora **no lo leía nadie** — había que abrir la base de
 * datos a mano para saber que alguien había pedido entrar.
 *
 * Solo lectura, y a propósito: dar de alta a un proveedor es crear su ficha, sus
 * zonas de cobertura y sus datos de liquidación, y eso ya tiene su formulario en
 * `/admin/suppliers/new`. Duplicar aquí un botón de "convertir" sería un segundo
 * camino a la misma tabla con la mitad de los campos.
 *
 * > **Lo que falta para que esto sea operativo.** La fila no sabe si ya se
 * > atendió, así que a partir de unas cuantas solicitudes no hay forma de
 * > distinguir la que falta por llamar de la que se convirtió hace un mes. La
 * > lista solo crece. Necesita una columna de estado
 * > (`NEW | CONTACTED | CONVERTED | DISCARDED`) y su migración; se dejó fuera
 * > porque es un cambio de schema y no una pantalla.
 */
export default async function SupplierLeadsPage() {
  await verifyAdmin();
  const leads = await getSupplierLeads();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitudes de alta</h1>
        <p className="text-muted-foreground">
          Quién ha pedido vender en Solaris desde la página <code>/sell</code>.
          El alta se hace a mano en Proveedores.
        </p>
      </div>

      {leads.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay solicitudes. Cuando alguien rellene el formulario de{" "}
          <code>/sell</code>, aparecerá aquí.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Negocio</TableHead>
              <TableHead>Provincia</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Cuándo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.business}</TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.province}
                </TableCell>
                {/* Texto libre: pidió "un WhatsApp o un correo", así que puede
                    llegar cualquier cosa. Se enseña tal cual y en monoespaciada
                    para que se copie sin errores. */}
                <TableCell className="font-mono text-sm">
                  {lead.contact}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {WHEN.format(lead.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
