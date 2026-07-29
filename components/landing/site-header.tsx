"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CartPanel } from "@/components/cart/cart-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionPayload } from "@/lib/session";

type SiteHeaderProps = {
  session: SessionPayload | null;
  /**
   * La página abre con un hero a sangre: la barra nace transparente sobre la
   * foto y se vuelve sólida al pasarlo. Sin esto nace sólida.
   */
  overHero?: boolean;
  /**
   * Por defecto el header flota fijo sobre el documento (la home, donde tiene
   * que montarse encima de la foto). Con `floating={false}` es una fila normal
   * de su contenedor: lo usan las pantallas con scroll propio (el catálogo),
   * donde el header es el techo de la columna y nadie necesita saber cuánto
   * mide para colocarse debajo.
   */
  floating?: boolean;
};

// Alto aproximado del header: solo lo usa el centinela del hero para decidir en
// qué punto del scroll la barra deja de flotar sobre la foto. Ninguna página
// depende ya de este número para colocarse debajo.
const HEADER_HEIGHT = 72;

/**
 * Barra del sitio. Sobre el hero va transparente, como si formara parte de la
 * foto; al pasar el hero se materializa en el fondo de página y sigue en
 * pantalla el resto de la página — que es lo que cose la home en un solo
 * documento en vez de dos.
 *
 * El cambio se dispara con el centinela (`data-hero-end`) que el hero deja al
 * final de la foto.
 */
export function SiteHeader({
  session,
  overHero = false,
  floating = true,
}: SiteHeaderProps) {
  const [solid, setSolid] = useState(!overHero);

  useEffect(() => {
    if (!overHero) return;

    const sentinel = document.querySelector("[data-hero-end]");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setSolid(entry.boundingClientRect.top <= HEADER_HEIGHT),
      { rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [overHero]);

  // El color del chrome de la barra: lo comparten los enlaces y el carrito, que
  // a diferencia de ellos no se esconde en móvil — es la salida del catálogo.
  const chromeClass = solid
    ? "text-muted-foreground hover:text-foreground"
    : "text-foreground-inverse/90 hover:text-foreground-inverse";

  const linkClass = cn(
    "text-nav ease-standard hidden transition-colors duration-slow sm:block",
    chromeClass,
  );

  return (
    <header
      className={cn(
        "px-gutter py-header z-50 flex items-center justify-between",
        floating ? "fixed inset-x-0 top-0" : "shrink-0",
        "ease-standard transition-colors duration-slow",
        // Sin línea inferior: lo que separa el header del contenido es la
        // primera línea de la propia página (la barra de filtros del catálogo,
        // p. ej.), que va pegada justo debajo.
        solid && "bg-background/95 backdrop-blur-sm",
      )}
    >
      <Link
        href="/"
        className={cn(
          "ease-standard transition-colors duration-slow",
          solid ? "text-foreground hover:text-foreground" : "text-foreground-inverse hover:text-foreground-inverse",
        )}
      >
        <span className="block text-xl font-bold tracking-[-0.01em]">solaris</span>
        <span
          className={cn(
            "block font-mono text-[10px] tracking-[0.14em]",
            solid ? "text-muted-foreground" : "text-foreground-inverse/75",
          )}
        >
          energía · cuba
        </span>
      </Link>

      <nav className="flex items-center gap-7">
        <Link href="/catalog" className={linkClass}>
          Kits
        </Link>
        {session ? (
          <>
            {session.role === "ADMIN" && (
              <Link href="/admin" className={linkClass}>
                Panel admin
              </Link>
            )}
            <Link href="/account" className={linkClass}>
              Mi cuenta
            </Link>
          </>
        ) : (
          <Link href="/login" className={linkClass}>
            Iniciar sesión
          </Link>
        )}
        <CartPanel className={chromeClass} />
        <Button asChild>
          <Link href="/catalog">Explora los kits</Link>
        </Button>
      </nav>
    </header>
  );
}
