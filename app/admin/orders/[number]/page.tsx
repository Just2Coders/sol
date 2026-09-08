import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyAdmin } from "@/lib/dal";
import { isPartDecidable, partOutcome } from "@/lib/orders/decisions";
import { ORDER_STATUS_LABEL, PART_STATUS_LABEL } from "@/lib/orders/labels";
import { getAdminOrder, type AdminOrderDetail } from "@/lib/orders/queries";
import { PartDecision } from "@/components/admin/part-decision";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const WHEN = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  return { title: `${number} — Solaris Admin` };
}

/**
 * Un pedido y sus partes, con los dos botones que mueven la etapa.
 *
 * Aquí es donde el admin resuelve por teléfono lo que el proveedor todavía no
 * puede resolver solo. Se enseña **el pedido entero**, con las partes caídas
 * incluidas y el motivo escrito al lado: una parte que desaparece de la pantalla
 * es una llamada del comprador preguntando qué pasó con ella.
 */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await verifyAdmin();
  const { number } = await params;
  const order = await getAdminOrder(number);
  if (!order) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/orders" className="text-muted-foreground text-sm hover:underline">
          ← Pedidos
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status]}</Badge>
            <span className="text-lg tabular-nums">${order.liveTotalUsd}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {order.user.name} · {order.user.email}
          {/* En un pedido sin partes vivas el marcador diría «0 de 0», que no es
              un dato sino una resta vacía. */}
          {order.progress.live > 0 && (
            <>
              {" "}
              · {order.progress.answered} de {order.progress.live} confirmados · vence el{" "}
              {WHEN.format(order.expiresAt)}
            </>
          )}
        </p>
      </div>

      <Gate order={order} />

      <section className="grid gap-4">
        {order.parts.map((part) => (
          <article key={part.id} className="border-border rounded-md border p-4">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{part.supplier.name}</h2>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{PART_STATUS_LABEL[part.status]}</Badge>
                <span className="tabular-nums">${part.subtotalUsd}</span>
              </div>
            </header>

            <p className="text-muted-foreground mt-1 text-sm">
              {partOutcome(part)}
              {part.supplier.phone && <> · {part.supplier.phone}</>}
              {isPartDecidable(part.status) && (
                <> · tiene hasta el {WHEN.format(part.confirmationDueAt)}</>
              )}
            </p>

            <ul className="mt-3 grid gap-1 text-sm">
              {part.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.nameSnapshot}
                    {item.quantity > 1 && (
                      <span className="text-muted-foreground"> × {item.quantity}</span>
                    )}
                  </span>
                  <span className="tabular-nums">
                    ${item.priceSnapshotUsd * item.quantity}
                  </span>
                </li>
              ))}
            </ul>

            {isPartDecidable(part.status) && (
              <div className="mt-4">
                <PartDecision partId={part.id} supplierName={part.supplier.name} />
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="text-sm">
        <h2 className="text-muted-foreground text-xs font-mono uppercase tracking-widest">
          Entrega
        </h2>
        <p className="mt-2">
          {order.contactName} · {order.contactPhone}
        </p>
        <p className="text-muted-foreground">
          {order.deliveryAddress}
          {order.zone && <> · {order.zone.name}</>}
        </p>
        {order.notes && <p className="text-muted-foreground mt-2">Notas: {order.notes}</p>}
      </section>
    </div>
  );
}

/**
 * Por qué no se puede cobrar, arriba del todo y con lo que hay que hacer.
 *
 * Se enseña siempre, también cuando sí se puede: no encontrar el aviso tiene que
 * significar "no lo he mirado", nunca "no había ninguno".
 */
function Gate({ order }: { order: AdminOrderDetail }) {
  if (order.gate.ok) {
    return (
      <p className="border-success-border bg-success-bg text-success rounded-md border p-3 text-sm">
        Todos los proveedores confirmaron y el total es el que el comprador aceptó.
        Listo para cobrar.
      </p>
    );
  }

  const message =
    order.gate.reason === "AWAITING_SUPPLIERS"
      ? order.gate.pending === 1
        ? "Falta un proveedor por confirmar. No se puede cobrar hasta que responda."
        : `Faltan ${order.gate.pending} proveedores por confirmar. No se puede cobrar hasta que respondan.`
      : order.gate.reason === "TOTAL_CHANGED"
        ? `El pedido encogió a $${order.gate.liveTotalUsd} y el comprador aceptó $${order.gate.acknowledgedTotalUsd}. Hasta que decida si sigue, el cobro está congelado.`
        : "No queda ninguna parte viva: no hay nada que cobrar.";

  return (
    <p className="border-warning-border bg-warning-bg text-warning rounded-md border p-3 text-sm">
      {message}
    </p>
  );
}
