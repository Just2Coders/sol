"use client";

import Link from "next/link";
import { ChevronDown, Search } from "reicon-react";

import { cn } from "@/lib/utils";

import { useKitSelection } from "./kit-selection";

/**
 * El buscador que cose el hero con la página.
 *
 * Va montado a caballo del borde inferior de la foto, mitad sobre la imagen y
 * mitad sobre el fondo de página: es lo que impide que el hero se lea como un
 * cartel cerrado y la página como otra cosa que empieza después. Que sobresalga
 * es el gesto entero — sin desbordar, es una barra más.
 *
 * El pliegue de la primera pantalla cae justo sobre esta barra, así que desde
 * el hero solo se ve su borde superior. El galón existe por eso: un cuadro
 * suelto, con su filete completo, flotando por encima de la barra —contra la
 * foto, que ahí abajo está oscura, el papel claro se recorta solo— que cabecea
 * despacio hacia abajo. Va separado y no cosido al borde: pegado se leía como
 * una pestaña del propio cajón, y suelto se lee como lo que es, una señal que
 * apunta a lo que hay debajo. Es lo único que se ve de la sección desde
 * arriba, y su trabajo es decir que la barra no está cortada, sino que sigue
 * — por eso es un botón, no solo un adorno: al pulsarlo baja directo al panel
 * de proveedores (`scroll-mt-8` en esa sección deja sitio para la barra fija).
 *
 * Los tres kits son un grupo de botones de estado, no enlaces: al pulsar no se
 * navega a ningún sitio, cambia el contenido de "Elige quién te lo instala" un
 * poco más abajo. Por eso los tres se dibujan idénticos —mismo filete, mismo
 * ancho de caja— y lo único que los distingue es cuál está pulsado: el filete
 * también lo lleva el activo, para que al cambiar de pestaña ninguna caja se
 * mueva un píxel.
 *
 * La lupa es un enlace —la salida al catálogo completo— y el galón hace scroll
 * dentro de la misma página: las dos acciones que llevan a otro sitio de la
 * barra, ninguna decorativa.
 */
export function KitFinder({ className }: { className?: string }) {
  const { kits, kit: current, select, panelId } = useKitSelection();

  return (
    <div className={cn("px-gutter flex justify-center", className)}>
      <div className="bg-card border-foreground relative flex flex-wrap items-center justify-center gap-x-7 gap-y-4 border px-7 py-5">
        {/* El galón va suelto por encima de la barra, con su filete completo:
            separado se lee como una señal —una pieza aparte que apunta a lo que
            hay debajo— y no como una pestaña del propio cajón. El contenedor ya
            va centrado porque la animación escribe `transform`, y un
            `-translate-x-1/2` en el mismo elemento se lo comería. */}
        <div className="absolute inset-x-0 -top-11 flex justify-center">
          <button
            type="button"
            onClick={() => {
              document
                .getElementById(panelId)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            aria-label="Ir a la sección de proveedores"
            className="bg-card border-foreground ease-standard hover:bg-muted flex h-7 items-center border px-3 transition-colors duration-base focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2"
          >
            <ChevronDown
              aria-hidden
              className="text-foreground animate-nudge size-4"
            />
          </button>
        </div>

        <div
          role="group"
          aria-label="Elige el kit que quieres comparar"
          className="flex flex-wrap items-center gap-2.5"
        >
          {kits.map((kit) => {
            const active = kit.slug === current.slug;

            return (
              <button
                key={kit.slug}
                type="button"
                aria-pressed={active}
                aria-controls={panelId}
                onClick={() => select(kit.slug)}
                className={cn(
                  "text-label tracking-mono-sm border-foreground ease-standard focus-visible:ring-ring border px-4 py-2.5 font-mono uppercase transition-colors duration-base focus-visible:ring-2 focus-visible:outline-none",
                  active
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {kit.name}
              </button>
            );
          })}
        </div>

        <Link
          href="/catalog?type=kit"
          aria-label="Ver todos los kits del catálogo"
          className="bg-primary-loud text-primary-loud-foreground hover:bg-primary-loud-hover ease-standard flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-base"
        >
          <Search aria-hidden className="size-4" />
        </Link>
      </div>
    </div>
  );
}
