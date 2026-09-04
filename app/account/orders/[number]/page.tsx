import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, Shop } from "reicon-react";

import { getCurrentUser } from "@/lib/dal";
import { ORDER_STATUS_LABEL, PART_STATUS_LABEL } from "@/lib/orders/labels";
import { getUserOrder } from "@/lib/orders/queries";
import { formatDeadline, formatUsd } from "@/lib/utils";

type OrderPageProps = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: OrderPageProps) {
  return { title: `Pedido ${(await params).number} — Solaris` };
}

// La cuenta atrás es el dato que el comprador viene a mirar.
export const dynamic = "force-dynamic";

/**
 * El pedido, entero y como se hizo.
 *
 * Nada se recorta ni desaparece: cuando la confirmación de partes exista
 * (Etapa 7), cada línea llevará al lado lo que le pasó —quién no pudo, quién no
 * respondió— y seguirá en la lista. Un pedido que se limpia solo es el que
 * genera la llamada.
 */
export default async function OrderPage({ params }: OrderPageProps) {
  const { number } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?from=/account/orders/${number}`);

  // Acotado por usuario en la propia consulta: el número corto es adivinable a
  // propósito, porque se dicta por teléfono.
  const order = await getUserOrder(user.id, number);
  if (!order) notFound();

  return (
    <main className="px-gutter py-section-sm mx-auto w-full max-w-3xl">
      <Link
        href="/account/orders"
        className="text-muted-foreground hover:text-foreground text-marginalia ease-standard font-mono underline underline-offset-4 transition-colors duration-base"
      >
        ← mis pedidos
      </Link>

      <header className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-foreground text-display-3">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-marginalia mt-2 font-mono">
            {ORDER_STATUS_LABEL[order.status]}
          </p>
        </div>
        <p className="text-foreground text-heading-2">
          {formatUsd(order.liveTotalUsd)}
        </p>
      </header>

      {order.status === "PENDING_PAYMENT" && (
        <section className="border-info-border bg-info-bg mt-8 rounded-md border p-5">
          <p className="text-info text-body-sm flex gap-2">
            <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Tenemos el stock apartado hasta el{" "}
              <span className="font-medium">{formatDeadline(order.expiresAt)}</span>.
              El pago se hace por Zelle, y{" "}
              <span className="font-medium">{order.orderNumber}</span> es la
              referencia que hay que poner.
            </span>
          </p>
        </section>
      )}

      <section className="mt-10 grid gap-8">
        {order.parts.map((part) => (
          <section key={part.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-muted-foreground text-label flex items-center gap-2 font-mono">
                <Shop aria-hidden className="size-3.5 shrink-0" />
                {part.supplier.name}
              </h2>
              <span className="text-muted-foreground text-marginalia font-mono">
                {PART_STATUS_LABEL[part.status]}
              </span>
            </div>

            <ul className="mt-3 grid gap-2">
              {part.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="text-foreground text-body-sm">
                    {item.nameSnapshot}
                    {item.quantity > 1 && (
                      <span className="text-muted-foreground text-marginalia font-mono">
                        {" "}
                        ×{item.quantity}
                      </span>
                    )}
                  </span>
                  <span className="text-foreground text-data shrink-0">
                    {formatUsd(
                      Math.round(item.priceSnapshotUsd * item.quantity * 100) / 100,
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {order.parts.length > 1 && (
              <p className="text-muted-foreground text-marginalia mt-2 text-right font-mono">
                subtotal {formatUsd(part.subtotalUsd)}
              </p>
            )}
          </section>
        ))}
      </section>

      <section className="border-border mt-10 grid gap-1 border-t pt-6">
        <h2 className="text-muted-foreground text-label font-mono uppercase">
          entrega
        </h2>
        <p className="text-foreground text-body-sm mt-2">
          {order.contactName} · {order.contactPhone}
        </p>
        <p className="text-muted-foreground text-body-sm">
          {order.deliveryAddress}
          {order.zone && ` · ${order.zone.name}`}
        </p>
        {order.notes && (
          <p className="text-muted-foreground text-body-sm mt-3">{order.notes}</p>
        )}
      </section>
    </main>
  );
}
