"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle } from "reicon-react";

import {
  placeOrderAction,
  previewCheckout,
  type CheckoutPreview,
} from "@/app/actions/orders";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCartHydrated, useCartLines, useCartStore } from "@/lib/cart/store";
import type { CartRequest } from "@/lib/orders/revalidate";
import type { ZoneOptionGroup } from "@/lib/zones/queries";

/**
 * El formulario del checkout, y el resumen que va con él.
 *
 * Es de cliente porque el carrito lo es: vive en `localStorage` y la página no
 * puede leerlo (ver ARCHITECTURE §3). De ahí sale la forma de esta pantalla —
 * el navegador tiene las líneas, el servidor tiene los precios, así que se
 * mandan las primeras para que vuelva el resumen ya releído. Y se vuelve a
 * mandar cada vez que cambia la zona de entrega, porque la cobertura depende de
 * ella y quitar un proveedor cambia el total.
 */

export type CheckoutDefaults = {
  contactName: string;
  contactPhone: string;
  zoneSlug: string;
};

export function CheckoutForm({
  zones,
  defaults,
}: {
  zones: ZoneOptionGroup[];
  defaults: CheckoutDefaults;
}) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const lines = useCartLines();
  const clear = useCartStore((state) => state.clear);

  const [zoneSlug, setZoneSlug] = useState(defaults.zoneSlug);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [reloading, startPreview] = useTransition();
  const [state, action, pending] = useActionState(placeOrderAction, undefined);

  // Solo el par tipo + id y la cantidad viajan: es lo único que el servidor le
  // acepta al cliente, y lo que estabiliza esta dependencia mientras el
  // visitante solo cambia la zona.
  const requests: CartRequest[] = useMemo(
    () => lines.map(({ type, id, quantity }) => ({ type, id, quantity })),
    [lines],
  );

  useEffect(() => {
    if (!hydrated || requests.length === 0 || !zoneSlug) return;

    // La respuesta vieja no puede pisar a la nueva: cambiar de zona dos veces
    // seguidas lanza dos viajes y no hay garantía de que vuelvan en orden.
    let current = true;
    startPreview(async () => {
      const next = await previewCheckout(requests, zoneSlug);
      if (current) setPreview(next);
    });
    return () => {
      current = false;
    };
  }, [hydrated, requests, zoneSlug]);

  // El pedido ya existe: vaciar el carrito es lo último que queda por hacer, y
  // solo puede hacerlo el cliente. Por eso la Action devuelve el número en vez
  // de redirigir.
  useEffect(() => {
    if (!state?.orderNumber) return;
    clear();
    router.replace(`/account/orders/${state.orderNumber}`);
  }, [state?.orderNumber, clear, router]);

  if (hydrated && lines.length === 0 && !state?.orderNumber) {
    return (
      <section className="py-section-sm">
        <p className="text-foreground text-heading-3">No llevas nada todavía.</p>
        <p className="text-muted-foreground text-body mt-2">
          Elige lo que necesitas en el catálogo y vuelve por aquí.
        </p>
        <Button asChild className="mt-6">
          <Link href="/catalog">Ver el catálogo</Link>
        </Button>
      </section>
    );
  }

  const problems = state?.problems ?? preview?.problems ?? [];
  const blocked = problems.length > 0 || preview === null;

  return (
    <form
      action={action}
      className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <input type="hidden" name="lines" value={JSON.stringify(requests)} />
      <input type="hidden" name="zoneSlug" value={zoneSlug} />

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="zone">Dónde se entrega</Label>
          {/* Sin zona no hay contra qué comparar la cobertura del proveedor, así
              que no es opcional ni cuando el pedido es solo mano de obra: el
              instalador también tiene que llegar hasta ahí. */}
          <Select value={zoneSlug} onValueChange={setZoneSlug}>
            <SelectTrigger id="zone" className="h-12 w-full">
              <SelectValue placeholder="Elige tu municipio" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((province) => (
                <SelectGroup key={province.slug}>
                  <SelectLabel>{province.name}</SelectLabel>
                  <SelectItem value={province.slug}>
                    {province.name} (toda la provincia)
                  </SelectItem>
                  {province.cities.map((city) => (
                    <SelectItem key={city.slug} value={city.slug}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={state?.errors?.zoneSlug} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="deliveryAddress">Dirección</Label>
          <Textarea
            id="deliveryAddress"
            name="deliveryAddress"
            rows={3}
            required
            placeholder="Calle, número, entre calles, y alguna referencia para encontrarlo."
          />
          <p className="text-muted-foreground text-marginalia font-mono">
            si el pedido lleva instalación, es la dirección de la obra
          </p>
          <FieldError errors={state?.errors?.deliveryAddress} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contactName">A nombre de</Label>
            <Input
              id="contactName"
              name="contactName"
              defaultValue={defaults.contactName}
              required
              className="h-12"
            />
            <FieldError errors={state?.errors?.contactName} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactPhone">Teléfono</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={defaults.contactPhone}
              required
              placeholder="+53 5 123 4567"
              className="h-12"
            />
            <FieldError errors={state?.errors?.contactPhone} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">
            {preview?.needsEquipmentNote ? "Qué equipo hay que atender" : "Notas (opcional)"}
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder={
              preview?.needsEquipmentNote
                ? "Qué tienes montado: paneles, inversor, batería, cómo está instalado."
                : "Algo que el proveedor deba saber."
            }
          />
          {preview?.needsEquipmentNote && (
            // Un servicio `ANY` se contrata sobre equipo que la plataforma no
            // conoce: esta descripción es lo único que va a tener quien se
            // presente en la casa.
            <p className="text-muted-foreground text-marginalia font-mono">
              contrataste un trabajo sobre equipo tuyo · descríbelo para que el
              instalador sepa a qué va
            </p>
          )}
          <FieldError errors={state?.errors?.notes} />
        </div>
      </div>

      <aside className="grid gap-4">
        {preview === null && (
          <p className="text-muted-foreground text-body-sm">Calculando tu pedido…</p>
        )}
        {/* Sin grupos no hay resumen que pintar: si todas las líneas tienen algo
            que las frena, ninguna llegó a agruparse y la tarjeta saldría vacía.
            Los problemas de abajo son entonces la pantalla entera. */}
        {preview !== null && preview.groups.length > 0 && (
          <CheckoutSummary preview={preview} />
        )}

        {problems.length > 0 && (
          <ul className="border-destructive-border bg-destructive-bg grid gap-2 rounded-md border p-4">
            {problems.map((problem) => (
              <li
                key={problem.message}
                className="text-destructive text-body-sm flex gap-2"
              >
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>{problem.message}</span>
              </li>
            ))}
          </ul>
        )}

        {state?.message && (
          <p className="text-destructive text-body-sm">{state.message}</p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || reloading || blocked}
        >
          {pending ? "Creando el pedido…" : "Confirmar pedido"}
        </Button>

        <p className="text-muted-foreground text-marginalia font-mono">
          confirmar no cobra nada · el Zelle se hace después, con el número del
          pedido como referencia
        </p>
      </aside>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-destructive text-body-sm">{errors[0]}</p>;
}
