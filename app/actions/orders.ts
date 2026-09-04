"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { MAX_LINE_QUANTITY } from "@/lib/cart/lines";
import { idSchema } from "@/lib/forms";
import {
  placeable,
  revalidateCart,
  type CartRequest,
  type CartSummary,
  type CheckoutProblem,
} from "@/lib/orders/revalidate";
import { placeOrder } from "@/lib/orders/service";
import { getSession } from "@/lib/session";

/**
 * Las dos entradas del checkout: mirar y comprar.
 *
 * El carrito vive en el navegador (ver ARCHITECTURE §3), así que el resumen que
 * se le enseña al comprador no puede armarlo la página: solo el servidor sabe el
 * precio que rige hoy, quién entrega de verdad cada cosa y hasta cuándo aguanta
 * reservado. `previewCheckout` es ese viaje, y se repite cada vez que cambia la
 * zona de entrega porque la cobertura depende de ella.
 *
 * Lo que manda el cliente **no se cree**: de cada línea se respetan el par
 * tipo + id y la cantidad, y todo lo demás se relee. Las dos entradas pasan por
 * la misma revalidación, así que lo que se ve en el resumen es exactamente lo
 * que se va a cobrar.
 */

/** Un tope de líneas para que nadie use el resumen como consulta masiva. */
const MAX_CART_LINES = 50;

const requestsSchema = z
  .array(
    z.object({
      type: z.enum(["PRODUCT", "KIT", "SERVICE"]),
      id: idSchema,
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
    }),
  )
  .max(MAX_CART_LINES);

/**
 * El resumen tal como viaja al cliente.
 *
 * Sin `compositions`: las piezas de cada kit solo le hacen falta a quien va a
 * retenerlas, y mandarlas sería enseñar de qué está hecho un kit a quien no lo
 * ha comprado.
 */
export type CheckoutPreview = Omit<CartSummary, "compositions"> & {
  problems: CheckoutProblem[];
};

const EXPIRED_SESSION: CheckoutProblem = {
  kind: "gone",
  message: "Tu sesión se cerró. Inicia sesión otra vez para terminar la compra.",
  supplierSlug: null,
};

export async function previewCheckout(
  requests: CartRequest[],
  zoneSlug: string,
): Promise<CheckoutPreview> {
  const session = await getSession();
  const parsed = requestsSchema.safeParse(requests);

  if (!session || !parsed.success) {
    return {
      zone: null,
      groups: [],
      subtotalUsd: 0,
      window: { expiresAt: new Date(), tightest: null, short: [] },
      needsEquipmentNote: false,
      problems: [
        session
          ? { kind: "gone", message: "El carrito tiene algo raro. Vacíalo y vuelve a armarlo.", supplierSlug: null }
          : EXPIRED_SESSION,
      ],
    };
  }

  const cart = await revalidateCart({ requests: parsed.data, zoneSlug });

  // Campo a campo y no con un rest: lo que cruza al navegador se escribe entero
  // a propósito, para que añadir algo al resumen sea una decisión y no un
  // descuido. `compositions` se queda aquí.
  return {
    zone: cart.zone,
    groups: cart.groups,
    subtotalUsd: cart.subtotalUsd,
    window: cart.window,
    needsEquipmentNote: cart.needsEquipmentNote,
    problems: cart.problems,
  };
}

export type CheckoutState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      /** Lo que impide cobrar, ya redactado. Se enseña junto al resumen. */
      problems?: CheckoutProblem[];
      /**
       * El pedido, cuando nació.
       *
       * Se devuelve en vez de redirigir desde aquí, que es lo que hace el resto
       * de Actions del proyecto: el carrito vive en `localStorage` y solo el
       * cliente puede vaciarlo, así que tiene que enterarse de que la compra
       * salió antes de navegar. Un `redirect()` sale por excepción y el
       * `useActionState` nunca vería este estado.
       */
      orderNumber?: string;
    }
  | undefined;

const checkoutSchema = z.object({
  zoneSlug: z.string().trim().min(1, { error: "Elige dónde se entrega el pedido." }),
  contactName: z
    .string()
    .trim()
    .min(2, { error: "Dinos a nombre de quién va el pedido." })
    .max(120),
  contactPhone: z
    .string()
    .trim()
    .min(6, { error: "Hace falta un teléfono para coordinar la entrega." })
    .max(40),
  deliveryAddress: z
    .string()
    .trim()
    .min(8, { error: "Escribe la dirección donde se entrega o se hace el trabajo." })
    .max(400),
  notes: z
    .string()
    .trim()
    .max(1000, { error: "Las notas son demasiado largas." })
    .transform((value) => value || null),
});

export async function placeOrderAction(
  _state: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const session = await getSession();
  if (!session) return { problems: [EXPIRED_SESSION] };

  const fields = checkoutSchema.safeParse({
    zoneSlug: formData.get("zoneSlug"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    deliveryAddress: formData.get("deliveryAddress"),
    notes: formData.get("notes") ?? "",
  });
  if (!fields.success) {
    return { errors: z.flattenError(fields.error).fieldErrors };
  }

  const requests = requestsSchema.safeParse(readLines(formData.get("lines")));
  if (!requests.success) {
    return {
      problems: [
        {
          kind: "gone",
          message: "El carrito tiene algo raro. Vacíalo y vuelve a armarlo.",
          supplierSlug: null,
        },
      ],
    };
  }

  // Se relee aquí otra vez, y no se confía en lo que vio el resumen: entre que
  // se pintó y se pulsó el botón cabe una subida de precio o la última unidad.
  const cart = await revalidateCart({
    requests: requests.data,
    zoneSlug: fields.data.zoneSlug,
  });

  const placeableCart = placeable(cart);
  if (!placeableCart) return { problems: cart.problems };

  const placed = await placeOrder({
    cart: placeableCart,
    userId: session.userId,
    ...fields.data,
  });
  if (!placed.ok) return { problems: placed.problems };

  revalidatePath("/account/orders");
  return { orderNumber: placed.order.orderNumber };
}

/** El carrito viaja como JSON en un campo oculto: es una lista, no un formulario. */
function readLines(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
