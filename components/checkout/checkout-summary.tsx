import { AlertTriangle, Clock, Shop } from "reicon-react";

import type { CheckoutPreview } from "@/app/actions/orders";
import { lineTotalUsd } from "@/lib/cart/lines";
import { formatDeadline, formatUsd } from "@/lib/utils";

/**
 * El pedido tal como quedaría, agrupado por quién entrega cada cosa.
 *
 * Los mismos grupos que enseña el panel del carrito y los mismos que serán filas
 * de `order_suppliers`: si aquí se vieran de otra forma, el comprador tendría que
 * volver a entender su pedido justo antes de pagarlo.
 *
 * Los precios son los que manda el servidor, no los que guardó el carrito. Que
 * no coincidan es raro pero posible —una subida de precio mientras la pestaña
 * estaba abierta—, y en ese caso el que vale es este.
 */
export function CheckoutSummary({ preview }: { preview: CheckoutPreview }) {
  const { groups, window: hold } = preview;

  return (
    <section className="border-border bg-canvas rounded-md border p-6">
      <h2 className="text-muted-foreground text-label font-mono uppercase">
        tu pedido
      </h2>

      <div className="mt-5 grid gap-5">
        {groups.map((group) => (
          <section key={group.supplierSlug}>
            <h3 className="text-muted-foreground text-label flex items-center gap-2 font-mono">
              <Shop aria-hidden className="size-3.5 shrink-0" />
              {group.supplierName}
            </h3>

            <ul className="mt-3 grid gap-2">
              {group.lines.map((line) => (
                <li
                  key={`${line.type}:${line.id}`}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className="text-foreground text-body-sm">
                    {line.name}
                    {line.quantity > 1 && (
                      <span className="text-muted-foreground text-marginalia font-mono">
                        {" "}
                        ×{line.quantity}
                        {line.unitLabel ? ` ${line.unitLabel}` : ""}
                      </span>
                    )}
                  </span>
                  <span className="text-foreground text-data shrink-0">
                    {formatUsd(lineTotalUsd(line))}
                  </span>
                </li>
              ))}
            </ul>

            {groups.length > 1 && (
              <p className="text-muted-foreground text-marginalia mt-2 text-right font-mono">
                subtotal {formatUsd(group.subtotalUsd)}
              </p>
            )}
          </section>
        ))}
      </div>

      <div className="border-border-strong mt-6 flex items-baseline justify-between gap-6 border-t pt-4">
        <span className="text-muted-foreground text-label font-mono">total</span>
        <span className="text-foreground text-heading-3">
          {formatUsd(preview.subtotalUsd)}
        </span>
      </div>

      {/* El plazo se dice **antes** de confirmar, no después: mientras todavía se
          puede quitar del carrito a quien lo acorta. */}
      <p className="text-muted-foreground text-body-sm mt-5 flex gap-2">
        <Clock aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <span>
          Al confirmar, lo apartamos hasta el{" "}
          <span className="text-foreground">{formatDeadline(hold.expiresAt)}</span>
          {hold.tightest && groups.length > 1 && (
            <> — es lo que retiene {hold.tightest.supplierName}, el más ajustado</>
          )}
          .
        </span>
      </p>

      {hold.short.length > 0 && (
        <p className="border-warning-border bg-warning-bg text-warning text-body-sm mt-3 flex gap-2 rounded-md border p-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {listNames(hold.short.map((part) => part.supplierName))} aparta el stock
            menos tiempo del que suele tardar un Zelle en verificarse. Puedes pedirlo
            igual, pero conviene pagar cuanto antes.
          </span>
        </p>
      )}
    </section>
  );
}

/** "A", "A y B", "A, B y C" — lo que se escribe, no un `join(", ")`. */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
