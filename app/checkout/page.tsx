import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCurrentUser } from "@/lib/dal";
import { getZonePreference } from "@/lib/zones/preference";
import { getZoneOptions } from "@/lib/zones/queries";

export const metadata = { title: "Confirmar pedido — Solaris" };

/**
 * El único punto del catálogo donde se exige la sesión.
 *
 * Hasta aquí se navega y se arma el carrito sin cuenta (ver PLAN.md): el login
 * se pide cuando hay algo que escribir a nombre de alguien, y `?from` devuelve
 * al comprador justo a esta página en vez de a la portada.
 *
 * `proxy.ts` no cubre `/checkout` porque no es un área privada —no hay nada de
 * nadie detrás, solo un formulario—, así que la puerta es esta comprobación.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/checkout");

  const [zones, preferredZone] = await Promise.all([
    getZoneOptions(),
    getZonePreference(),
  ]);

  return (
    <main className="px-gutter py-section-sm mx-auto w-full max-w-6xl">
      <header className="max-w-2xl">
        <p className="text-emphasis text-label font-mono uppercase">confirmar pedido</p>
        <h1 className="text-foreground text-display-3 mt-2">Ya casi</h1>
        <p className="text-muted-foreground text-body mt-3">
          Revisa lo que llevas y dinos dónde entregarlo. Al confirmar apartamos el
          stock a tu nombre; el pago se hace después, por Zelle.
        </p>
      </header>

      <CheckoutForm
        zones={zones}
        defaults={{
          // Se proponen los datos de la cuenta, pero el pedido puede ir a otra
          // persona y a otra dirección: son campos del pedido, no del perfil.
          contactName: user.name,
          contactPhone: user.phone ?? "",
          zoneSlug: preferredZone ?? user.zone?.slug ?? "",
        }}
      />
    </main>
  );
}
