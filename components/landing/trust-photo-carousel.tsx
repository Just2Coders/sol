"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { TrustPhoto } from "./trust-data";

/** Cuánto queda cada foto en pantalla antes de pasar a la siguiente. */
const SLIDE_MS = 4800;

/**
 * Una foto por vez, en automático — tipo historia.
 *
 * Sin flechas ni controles: el diseño de la página no tiene ese vocabulario de
 * botón redondo sobre foto. Lo único que marca el paso del tiempo es la tira
 * de filetes arriba, que se rellena en el mismo tiempo que dura cada foto —la
 * misma convención que Instagram o WhatsApp, pero apagada, sin competir con la
 * foto.
 */
export function TrustPhotoCarousel({ photos }: { photos: TrustPhoto[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, SLIDE_MS);
    return () => clearTimeout(id);
  }, [index, photos.length]);

  return (
    <div className="relative h-full w-full">
      {photos.map((photo, i) => (
        <Image
          key={photo.url}
          src={photo.url}
          alt={photo.alt}
          fill
          sizes="100vw"
          priority={i === 0}
          className={cn(
            "object-cover transition-opacity duration-slow ease-standard",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      <div aria-hidden className="absolute inset-x-4 top-4 flex gap-1.5">
        {photos.map((photo, i) => (
          <div
            key={photo.url}
            className="bg-background/30 relative h-0.5 flex-1 overflow-hidden rounded-full"
          >
            {i < index && <span className="bg-background absolute inset-0" />}
            {i === index && <ActiveFill key={index} duration={SLIDE_MS} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * El filete activo arranca en 0% y se anima a 100% en el mismo tiempo que
 * dura la foto. Remonta con la `key={index}` del padre, así que cada foto
 * nueva vuelve a arrancar desde cero en vez de heredar el ancho de la
 * anterior.
 */
function ActiveFill({ duration }: { duration: number }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span
      className="bg-background absolute inset-y-0 left-0 transition-[width] ease-linear"
      style={{ width: filled ? "100%" : "0%", transitionDuration: `${duration}ms` }}
    />
  );
}
