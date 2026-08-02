import Link from "next/link";
import { ArrowRight } from "reicon-react";

import { CartPanel } from "@/components/cart/cart-panel";
import type { SessionPayload } from "@/lib/session";

import { FlatCta } from "./flat-cta";

/**
 * Barra del sitio.
 *
 * Asimétrica en vez de centrada: la marca abre a la izquierda, la navegación
 * respira en el medio —un solo `nav` a `flex-1` que la centra sin importar
 * cuánto pesen los lados— y las acciones cierran a la derecha con una flecha,
 * no solo un rótulo. Es la composición de la exploración "Header V1" en
 * Wonder, pero sobre el fondo real de la página: ahí el lienzo era oscuro
 * porque flotaba sobre una foto; aquí es una barra de verdad —fondo de
 * página y línea inferior—, así que se queda en el mismo `bg-background`
 * que el resto del documento.
 *
 * Fija arriba (`sticky top-0`): se queda visible durante todo el scroll de la
 * página, no solo en el hero. No hace falta un listener de scroll ni volver a
 * montarlo con estado — `sticky` es CSS puro, así que el componente sigue
 * siendo de servidor: la sesión llega por props y aquí no queda estado que
 * hidratar (el carrito trae el suyo). El fondo sólido es lo que lo permite:
 * antes, cuando se montaba transparente encima del hero, fijarlo habría
 * dejado la marca flotando sin apoyo sobre el cielo de la foto; con
 * `bg-background` debajo ya no hay foto de la que despegarse.
 */
export function SiteHeader({ session }: { session: SessionPayload | null }) {
  const navClass =
    "text-label tracking-mono-md text-foreground ease-standard hidden font-mono uppercase transition-colors duration-base hover:text-primary-loud sm:block";

  return (
    <header className="px-gutter border-foreground bg-background sticky top-0 z-40 flex h-19 shrink-0 items-center justify-between border-b">
      {/* Izquierda — la marca. El descriptor va a su lado y no debajo: en una
          barra de 76 px apilarlos la parte en dos pisos y el filete deja de
          leerse como el suelo de la marca. */}
      <Link href="/" className="flex shrink-0 items-baseline gap-3">
        <span className="text-brand text-foreground">solaris</span>
        <span className="text-marginalia tracking-mono-md text-foreground hidden font-mono uppercase sm:block">
          energía · cuba
        </span>
      </Link>

      {/* Centro — a dónde se va. En el boceto es un menú desplegable; aquí los
          destinos se escriben en vez de esconderse. */}
      <nav aria-label="Principal" className="flex flex-1 items-center justify-center gap-8">
        <Link href="/catalog?type=kit" className={navClass}>
          Kits
        </Link>
        <Link href="/catalog?type=product" className={navClass}>
          Equipos sueltos
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

      <div className="flex shrink-0 items-center gap-6">
        <CartPanel className="text-foreground hover:text-primary-loud" />
        <FlatCta href="/#supplier" tone="loud" size="md" className="gap-2">
          Vender en Solaris
          <ArrowRight aria-hidden className="size-4" />
        </FlatCta>
      </div>
    </header>
  );
}
