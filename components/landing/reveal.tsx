"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Envuelve un bloque para que entre con un fundido al cruzar el viewport, una
 * sola vez — el observer se desconecta en cuanto dispara, no hay nada que
 * volver a vigilar. Quien pide menos movimiento lo ve completo desde el
 * primer fotograma, sin transición: es la misma regla que sigue el galón del
 * buscador (`.animate-nudge` en globals.css).
 */
export function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "ease-standard transition-[opacity,transform] duration-slow",
        "motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
