"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "reicon-react";

import { cn } from "@/lib/utils";

/**
 * El carril de fichas que se va a sangre por el borde derecho.
 *
 * Hoy la única pieza de la home que cruza el gutter es la foto del hero; todo
 * lo demás vive encerrado en el mismo margen y la página se lee como una
 * columna de bloques. El carril rompe eso: sale del margen izquierdo, se corta
 * en el borde del viewport y deja media ficha asomando, que es lo que dice
 * "sigue" sin escribirlo.
 *
 * Los controles son la única excepción al radio 0 de estas variantes: un
 * control de carrusel es un círculo, no un rectángulo redondeado.
 */
export function KitRail({
  controlClassName,
  className,
  children,
}: {
  controlClassName: string;
  className?: string;
  children: React.ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);

  // Se desplaza el ancho de la primera ficha: así el carril siempre para con
  // una ficha alineada al margen izquierdo, sin medir nada a mano.
  function scrollByCard(direction: 1 | -1) {
    const node = rail.current;
    if (!node) return;
    const card = node.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : node.clientWidth * 0.8;
    node.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <div className={className}>
      <div
        ref={rail}
        className="-mr-gutter flex snap-x snap-mandatory gap-6 overflow-x-auto pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          type="button"
          aria-label="Kit anterior"
          onClick={() => scrollByCard(-1)}
          className={cn(
            "ease-standard flex size-11 items-center justify-center rounded-full border transition-colors duration-base",
            controlClassName,
          )}
        >
          <ArrowLeft aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Kit siguiente"
          onClick={() => scrollByCard(1)}
          className={cn(
            "ease-standard flex size-11 items-center justify-center rounded-full border transition-colors duration-base",
            controlClassName,
          )}
        >
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  );
}
