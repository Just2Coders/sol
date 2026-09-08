"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BellRing, Check } from "reicon-react";

import {
  unwatchProduct,
  watchProduct,
  type StockAlertState,
} from "@/app/actions/stock-alerts";
import { phraseRestock, type RestockPhrasing } from "@/lib/inventory/restocks";
import { Button } from "@/components/ui/button";

const DAY = new Intl.DateTimeFormat("es", { day: "numeric", month: "long" });
const MONTH = new Intl.DateTimeFormat("es", { month: "long" });
const asDate = (iso: string) => new Date(`${iso}T00:00:00`);

/**
 * Cuándo vuelve, dicho sin fingir precisión.
 *
 * El "aprox." no es cortesía: es lo único que separa una previsión de una
 * promesa, y la ventana de dos fechas está en el modelo precisamente para que la
 * UI no pueda decirlo de otra forma.
 */
function windowText(phrasing: RestockPhrasing): string {
  switch (phrasing.kind) {
    case "day":
      return `Vuelve aprox. el ${DAY.format(asDate(phrasing.day))}`;
    case "range":
      return `Vuelve aprox. entre el ${DAY.format(asDate(phrasing.from))} y el ${DAY.format(asDate(phrasing.to))}`;
    case "month":
      return `Vuelve aprox. en ${MONTH.format(asDate(phrasing.day))}`;
  }
}

/**
 * Lo que ocupa el sitio del botón de compra cuando no hay nada que vender.
 *
 * Un agotado sin salida es una página que no sirve para nada: quien llegó hasta
 * aquí quería esto, y lo mínimo es decirle si vuelve y ofrecerle avisarle. Lo que
 * **no** se hace es venderlo igual — con pago manual, cobrar por adelantado
 * contra una fecha aproximada es prometer lo que no se controla (la pre-orden es
 * Fase 2, ver PLAN.md).
 *
 * `restock` en `null` significa **no sabemos**, y se dice así. "Vuelve pronto"
 * cuando nadie lo ha prometido es lo que hace que la siguiente promesa no valga.
 */
export function RestockNotice({
  watch,
  restock,
  today,
}: {
  /**
   * Con qué producto apuntarse al aviso. Un **kit** no lo lleva: `stock_alerts`
   * es por producto, y apuntarse a un kit sería apuntarse a cada pieza que le
   * falte — más maquinaria de la que hoy hace falta. Su ficha dice cuándo vuelve
   * y remite a las piezas.
   */
  watch?: {
    productId: string;
    slug: string;
    signedIn: boolean;
    watching: boolean;
  };
  restock: { etaFrom: string; etaTo: string } | null;
  /** `YYYY-MM-DD` del servidor: la frase depende de cuánto falta. */
  today: string;
}) {
  return (
    <div className="border-border bg-muted rounded-md border p-5">
      <p className="text-foreground text-body-sm max-w-[46ch] font-medium">
        {watch ? "Ahora mismo no queda ninguna unidad." : "Ahora mismo no se puede armar."}
      </p>

      <p className="text-muted-foreground text-body-sm mt-2 max-w-[46ch]">
        {restock
          ? windowText(phraseRestock(restock, today))
          : watch
            ? "Todavía no hay fecha de vuelta. Si te apuntas, te escribimos en cuanto entre."
            : "Todavía no hay fecha para las piezas que faltan."}
      </p>

      {watch && (
        <div className="mt-4">
          {watch.signedIn ? (
            <WatchButton
              productId={watch.productId}
              slug={watch.slug}
              watching={watch.watching}
            />
          ) : (
            <Button asChild variant="outline">
              {/* El mismo `?from=` que usa el resto del sitio: volver aquí
                  después de entrar, no a la home. */}
              <Link href={`/login?from=/catalog/products/${watch.slug}`}>
                <BellRing aria-hidden />
                Entra y te avisamos
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function WatchButton({
  productId,
  slug,
  watching,
}: {
  productId: string;
  slug: string;
  watching: boolean;
}) {
  const [state, action, pending] = useActionState<StockAlertState, FormData>(
    watching ? unwatchProduct : watchProduct,
    undefined,
  );

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />

      <Button type="submit" variant={watching ? "ghost" : "outline"} disabled={pending}>
        {watching ? <Check aria-hidden /> : <BellRing aria-hidden />}
        {pending
          ? "Un momento..."
          : watching
            ? "Te avisaremos — cancelar"
            : "Avísame cuando vuelva"}
      </Button>

      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
    </form>
  );
}
