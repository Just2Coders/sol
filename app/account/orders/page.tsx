import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/dal";
import { getUserOrders } from "@/lib/orders/queries";
import { ORDER_STATUS_LABEL } from "@/lib/orders/labels";
import { formatDeadline, formatUsd } from "@/lib/utils";

export const metadata = { title: "Mis pedidos — Solaris" };

// Lo que se enseña es la cuenta atrás de un pedido vivo: cachearla sería
// enseñar un plazo que ya pasó.
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/account/orders");

  const orders = await getUserOrders(user.id);

  return (
    <main className="px-gutter py-section-sm mx-auto w-full max-w-3xl">
      <h1 className="text-foreground text-display-3">Mis pedidos</h1>

      {orders.length === 0 ? (
        <section className="mt-10">
          <p className="text-muted-foreground text-body">
            Todavía no has hecho ninguno.
          </p>
          <Button asChild className="mt-6">
            <Link href="/catalog">Ver el catálogo</Link>
          </Button>
        </section>
      ) : (
        <ul className="mt-10 grid gap-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="border-border hover:border-border-strong ease-standard block rounded-md border p-5 transition-colors duration-base"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <span className="text-foreground text-heading-3">
                    {order.orderNumber}
                  </span>
                  <span className="text-foreground text-data">
                    {formatUsd(order.liveTotalUsd)}
                  </span>
                </div>

                <p className="text-muted-foreground text-marginalia mt-2 font-mono">
                  {ORDER_STATUS_LABEL[order.status]} ·{" "}
                  {order.partCount === 1
                    ? "un proveedor"
                    : `${order.partCount} proveedores`}
                </p>

                {order.status === "PENDING_PAYMENT" && (
                  <p className="text-muted-foreground text-body-sm mt-3">
                    Apartado hasta el {formatDeadline(order.expiresAt)}.
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
