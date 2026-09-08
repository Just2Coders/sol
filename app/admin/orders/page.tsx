import Link from "next/link";
import { verifyAdmin } from "@/lib/dal";
import { ORDER_STATUS_LABEL } from "@/lib/orders/labels";
import { getAdminOrders, type AdminOrderRow } from "@/lib/orders/queries";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Pedidos — Solaris Admin" };
export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

/**
 * La cola de trabajo, no el archivo de pedidos.
 *
 * Lo que ordena la pantalla es **qué hay que hacer con cada fila**, y por eso la
 * columna que más pesa es la del bloqueo: un pedido esperando a un proveedor
 * necesita una llamada, uno con el total cambiado necesita al comprador, y uno
 * sin nada pendiente está listo para cobrarse. Un listado que solo dijera el
 * estado obligaría a abrir los cinco para saber cuál es cuál.
 */
export default async function AdminOrdersPage() {
  await verifyAdmin();
  const orders = await getAdminOrders();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <p className="text-muted-foreground">
          Qué falta en cada uno para poder cobrarlo. Confirmar o rechazar la parte
          de un proveedor se hace dentro.
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay pedidos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Qué falta</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/orders/${order.orderNumber}`} className="hover:underline">
                    {order.orderNumber}
                  </Link>
                  {order.progress.live > 0 && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {order.progress.answered} de {order.progress.live}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {order.user.email}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <Blocker order={order} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${order.liveTotalUsd}
                  {/* Solo cuando encogió: repetir el mismo número dos veces en
                      cada fila enseñaría ruido en lugar del cambio. */}
                  {order.liveTotalUsd !== order.totalUsd && (
                    <span className="text-muted-foreground ml-1 text-xs line-through">
                      ${order.totalUsd}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums text-sm">
                  {WHEN.format(order.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/** Por qué no se puede cobrar todavía, escrito para quien va a resolverlo. */
function Blocker({ order }: { order: AdminOrderRow }) {
  if (order.gate.ok) return <span className="text-success">Listo para cobrar</span>;

  switch (order.gate.reason) {
    case "AWAITING_SUPPLIERS":
      return (
        <span>
          {order.gate.pending}{" "}
          {order.gate.pending === 1 ? "proveedor sin confirmar" : "proveedores sin confirmar"}
        </span>
      );
    case "TOTAL_CHANGED":
      return <span className="text-warning">El comprador no ha aceptado el total nuevo</span>;
    case "NOTHING_LIVE":
      return <span className="text-muted-foreground">No queda nada que cobrar</span>;
  }
}
