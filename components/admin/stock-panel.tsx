"use client";

import { useActionState } from "react";
import {
  createRestock,
  dismissRestock,
  markRestockArrived,
  recordLoss,
  recountStock,
  type InventoryFormState,
} from "@/app/actions/inventory";
import { FieldError } from "@/components/admin/field-error";
import { isoDay, isRestockVisible } from "@/lib/inventory/restocks";
import type { MovementRow, RestockRow } from "@/lib/inventory/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** El motivo, en la voz del almacén y no en la del enum. */
const REASON_LABEL: Record<MovementRow["reason"], string> = {
  OPENING: "Apertura",
  RESTOCK: "Reposición",
  SALE: "Venta",
  RELEASE: "Reserva liberada",
  ADJUSTMENT: "Recuento",
  LOSS: "Merma",
  RETURN: "Devolución",
};

const WHEN = new Intl.DateTimeFormat("es", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DAY = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const day = (iso: string) => DAY.format(new Date(`${iso}T00:00:00`));

/**
 * El inventario de un producto: cuánto hay, qué se prometió y por qué cambió.
 *
 * Las tres cosas juntas y en este orden porque es como se mira un almacén: qué
 * puedo vender hoy, qué va a entrar, y cómo llegué hasta aquí. El histórico va
 * abajo — se consulta cuando algo no cuadra, no todos los días.
 */
export function StockPanel({
  productId,
  stock,
  reserved,
  available,
  movements,
  restocks,
}: {
  productId: string;
  stock: number;
  reserved: number;
  available: number;
  movements: MovementRow[];
  restocks: RestockRow[];
}) {
  const today = isoDay(new Date());
  const pending = restocks.filter((restock) => restock.status === "ANNOUNCED");
  const resolved = restocks.filter((restock) => restock.status !== "ANNOUNCED");

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>
            Lo vendible es lo que hay menos lo comprometido por pedidos sin
            cobrar. El saldo solo se mueve desde aquí, y cada cambio queda
            explicado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <dl className="grid grid-cols-3 gap-4">
            <Figure label="En almacén" value={stock} />
            <Figure label="Comprometido" value={reserved} />
            <Figure label="Vendible" value={available} strong />
          </dl>

          <div className="grid gap-6 sm:grid-cols-2">
            <RecountForm productId={productId} stock={stock} />
            <LossForm productId={productId} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reposiciones</CardTitle>
          <CardDescription>
            Lo que va a entrar. No suma al almacén hasta que llega — es una
            previsión, y por eso se anuncia con una ventana de días y no con una
            fecha exacta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <AnnounceForm productId={productId} today={today} />

          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay ninguna reposición anunciada.
            </p>
          ) : (
            <ul className="grid gap-3">
              {pending.map((restock) => (
                <PendingRestock
                  key={restock.id}
                  productId={productId}
                  restock={restock}
                  stale={!isRestockVisible(restock, today)}
                />
              ))}
            </ul>
          )}

          {resolved.length > 0 && (
            <details className="text-sm">
              <summary className="text-muted-foreground cursor-pointer">
                Reposiciones cerradas ({resolved.length})
              </summary>
              <ul className="mt-3 grid gap-2">
                {resolved.map((restock) => (
                  <li key={restock.id} className="text-muted-foreground">
                    {restock.quantity} uds · {day(restock.etaFrom)}–
                    {day(restock.etaTo)} ·{" "}
                    <Badge variant="outline">{restock.status}</Badge>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            Cada cambio del saldo, con su motivo y quién lo hizo. Los últimos{" "}
            {movements.length}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              El libro está vacío. No debería: todo producto abre con su saldo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">Cambio</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Quién</TableHead>
                  <TableHead>Cuándo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell
                      className={`text-right tabular-nums ${
                        movement.delta < 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {movement.delta > 0 ? "+" : ""}
                      {movement.delta}
                    </TableCell>
                    <TableCell>{REASON_LABEL[movement.reason]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.note ?? "—"}
                    </TableCell>
                    {/* El actor real más a nombre de quién: el histórico dice
                        "el admin ajustó el almacén de X" y no miente. */}
                    <TableCell className="text-muted-foreground text-sm">
                      {movement.actorName ?? "sistema"}
                      {movement.onBehalfOfName && (
                        <span> · por {movement.onBehalfOfName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums text-sm">
                      {WHEN.format(movement.occurredAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Figure({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "text-2xl font-semibold" : "text-2xl"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Feedback común a los cuatro formularios de esta pantalla. */
function FormFeedback({ state }: { state: InventoryFormState }) {
  return (
    <>
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state?.success && <p className="text-success text-sm">Anotado.</p>}
    </>
  );
}

function RecountForm({ productId, stock }: { productId: string; stock: number }) {
  const [state, action, pending] = useActionState<InventoryFormState, FormData>(
    recountStock,
    undefined,
  );

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Label htmlFor="countedUnits">Recuento del almacén</Label>
      {/* Se pregunta cuánto hay, no cuánto ha cambiado: a un almacén se le
          cuenta. La diferencia contra el libro la saca el servidor. */}
      <Input
        id="countedUnits"
        name="countedUnits"
        inputMode="numeric"
        defaultValue={stock}
        required
      />
      <Input name="note" placeholder="Nota (opcional)" />
      <FieldError state={state} field="countedUnits" />
      <FormFeedback state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Anotando..." : "Anotar recuento"}
      </Button>
    </form>
  );
}

function LossForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<InventoryFormState, FormData>(
    recordLoss,
    undefined,
  );

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Label htmlFor="units">Merma</Label>
      <Input
        id="units"
        name="units"
        inputMode="numeric"
        placeholder="Unidades perdidas"
        required
      />
      <Input name="note" placeholder="Rotura, robo, garantía..." />
      <FieldError state={state} field="units" />
      <FormFeedback state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Anotando..." : "Anotar merma"}
      </Button>
    </form>
  );
}

function AnnounceForm({ productId, today }: { productId: string; today: string }) {
  const [state, action, pending] = useActionState<InventoryFormState, FormData>(
    createRestock,
    undefined,
  );

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="productId" value={productId} />

      <div className="grid gap-2">
        <Label htmlFor="quantity">Cuántas</Label>
        <Input id="quantity" name="quantity" inputMode="numeric" required />
        <FieldError state={state} field="quantity" />
      </div>

      {/* La ventana **es** la incertidumbre: estrecha significa "seguro", ancha
          "creo que sí". Por eso son dos fechas y no una. */}
      <div className="grid gap-2">
        <Label htmlFor="etaFrom">No antes de</Label>
        <Input id="etaFrom" name="etaFrom" type="date" min={today} required />
        <FieldError state={state} field="etaFrom" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="etaTo">No después de</Label>
        <Input id="etaTo" name="etaTo" type="date" min={today} required />
        <FieldError state={state} field="etaTo" />
      </div>

      <div className="grid content-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Anunciando..." : "Anunciar"}
        </Button>
      </div>

      <div className="sm:col-span-4">
        <Input name="note" placeholder="Nota (opcional)" />
        <FormFeedback state={state} />
      </div>
    </form>
  );
}

function PendingRestock({
  productId,
  restock,
  stale,
}: {
  productId: string;
  restock: RestockRow;
  stale: boolean;
}) {
  const [arriveState, arrive, arriving] = useActionState<InventoryFormState, FormData>(
    markRestockArrived,
    undefined,
  );
  const [dismissState, dismiss, dismissing] = useActionState<
    InventoryFormState,
    FormData
  >(dismissRestock, undefined);

  return (
    <li className="border-border grid gap-3 rounded-md border p-4 sm:grid-cols-[1fr_auto]">
      <div>
        <p className="font-medium">
          {restock.quantity} unidades · {day(restock.etaFrom)}–{day(restock.etaTo)}
        </p>
        {restock.note && (
          <p className="text-sm text-muted-foreground">{restock.note}</p>
        )}
        {/* El catálogo ya dejó de enseñarla al pasar su ventana; aquí sigue
            visible porque alguien tiene que cerrarla. Ocultar no es cerrar. */}
        {stale && (
          <p className="text-warning text-sm">
            Su ventana ya pasó: el catálogo dejó de anunciarla.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <form action={arrive} className="flex items-center gap-2">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="restockId" value={restock.id} />
          {/* Lo que llega puede no ser lo anunciado, y esa distancia es la que
              dice quién cumple. Por eso se pregunta en vez de darlo por bueno. */}
          <Input
            name="arrivedUnits"
            inputMode="numeric"
            defaultValue={restock.quantity}
            aria-label="Unidades que llegaron"
            className="w-24"
            required
          />
          <Button type="submit" size="sm" disabled={arriving}>
            {arriving ? "..." : "Llegó"}
          </Button>
        </form>

        <form action={dismiss}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="restockId" value={restock.id} />
          <Button type="submit" size="sm" variant="ghost" disabled={dismissing}>
            {dismissing ? "..." : "Cancelar"}
          </Button>
        </form>
      </div>

      <div className="sm:col-span-2">
        <FieldError state={arriveState} field="arrivedUnits" />
        <FormFeedback state={arriveState} />
        <FormFeedback state={dismissState} />
      </div>
    </li>
  );
}
