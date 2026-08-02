"use client";

import Link from "next/link";
import { Search } from "reicon-react";

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
 * Los tres kits son un grupo de botones de estado, no enlaces: al pulsar no se
 * navega a ningún sitio, cambia el contenido de "Elige quién te lo instala" un
 * poco más abajo. Por eso los tres se dibujan idénticos —mismo filete, mismo
 * ancho de caja— y lo único que los distingue es cuál está pulsado: el filete
 * también lo lleva el activo, para que al cambiar de pestaña ninguna caja se
 * mueva un píxel.
 *
 * La lupa sí es un enlace: es la salida al catálogo completo, la única acción
 * de la barra que se lleva al visitante a otra página.
 */
export function KitFinder({ className }: { className?: string }) {
  const { kits, kit: current, select, panelId } = useKitSelection();

  return (
    <div className={cn("px-gutter flex justify-center", className)}>
      <div className="bg-card border-foreground flex flex-wrap items-center justify-center gap-x-7 gap-y-4 border px-7 py-5">
        <p className="text-caption text-foreground font-bold">Encuentra tu kit</p>

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
