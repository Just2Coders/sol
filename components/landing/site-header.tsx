import Link from "next/link";

import { CartPanel } from "@/components/cart/cart-panel";
import type { SessionPayload } from "@/lib/session";

import { FlatCta } from "./flat-cta";

/**
 * Barra del sitio.
 *
 * Tres zonas y un filete: navegación a la izquierda, la marca centrada, y a la
 * derecha el carrito con la única acción sólida. Es una barra de verdad —fondo
 * de página y línea inferior— y no un chrome flotando sobre la foto: el hero
 * empieza justo debajo, así que lo que separa la marca de la fotografía es esa
 * línea y nada más.
 *
 * No flota ni escucha el scroll. Antes se montaba transparente encima del hero
 * y se materializaba al pasarlo; con la marca centrada esa transición dejaba la
 * palabra "solaris" flotando sin apoyo sobre el cielo de la foto. Al salir el
 * `useEffect`, el componente vuelve a ser de servidor: la sesión llega por
 * props y aquí no queda estado que hidratar (el carrito trae el suyo).
 */
export function SiteHeader({ session }: { session: SessionPayload | null }) {
  const navClass =
    "text-label tracking-mono-md text-foreground ease-standard hidden font-mono uppercase transition-colors duration-base hover:text-primary-loud sm:block";

  return (
    <header className="px-gutter border-foreground bg-background flex h-19 shrink-0 items-center justify-between border-b">
      {/* Izquierda — a dónde se va. En el boceto es un menú desplegable; aquí
          los destinos son tres, así que se escriben en vez de esconderse. */}
      <nav aria-label="Principal" className="flex flex-1 items-center gap-6">
        <Link href="/catalog?type=kit" className={navClass}>
          Kits
        </Link>
        {session ? (
          <>
            {session.role === "ADMIN" && (
              <Link href="/admin" className={navClass}>
                Panel admin
              </Link>
            )}
            <Link href="/account" className={navClass}>
              Mi cuenta
            </Link>
          </>
        ) : (
          <Link href="/login" className={navClass}>
            Entrar
          </Link>
        )}
      </nav>

      {/* Centro — la marca. El descriptor va a su lado y no debajo: en una barra
          de 76 px apilarlos la parte en dos pisos y el filete deja de leerse
          como el suelo de la marca. */}
      <Link href="/" className="flex items-baseline gap-3">
        <span className="text-brand text-foreground">solaris</span>
        <span className="text-marginalia tracking-mono-md text-foreground hidden font-mono uppercase sm:block">
          energía · cuba
        </span>
      </Link>

      <div className="flex flex-1 items-center justify-end gap-6">
        <CartPanel className="text-foreground hover:text-primary-loud" />
        <FlatCta href="/#supplier" tone="ink" size="md">
          Vender en Solaris
        </FlatCta>
      </div>
    </header>
  );
}
