"use client";

import { useEffect, useRef, useState } from "react";

/**
 * El pie que estaba detrás todo el rato.
 *
 * La página sube como una cortina y va destapando el pie, que no se mueve. No
 * hay scroll listener ni animación: el efecto es puro apilado. El pie va
 * `fixed` al fondo del viewport y detrás (`z-0`); la página va delante, opaca y
 * en `z-10`; y entre las dos se deja un hueco del alto exacto del pie, que es
 * por donde asoma. Lo único que se mueve es la cortina, empujada por el scroll
 * de siempre.
 *
 * El contenido no lo conoce este componente: recibe el pie por `children`, así
 * que el diseño de dentro puede cambiar entero sin tocar la mecánica.
 *
 * ── Por qué mide el alto en cliente ────────────────────────────────────────
 * El hueco y el pie tienen que medir lo mismo, y el pie mide lo que ocupe su
 * contenido. Se podría fijar a `100svh` y evitar el JS, pero entonces el pie
 * queda atado a la pantalla en vez de a su contenido.
 *
 * ── Y por qué a veces se apaga sola ────────────────────────────────────────
 * El efecto solo existe mientras el pie cabe en la pantalla: lo que se destapa
 * es el fondo del viewport, así que si el pie es más alto que la ventana, su
 * mitad de arriba queda por encima del borde y no hay scroll que la alcance —
 * `fixed` no scrollea. En ese caso se apaga y el pie vuelve al flujo normal,
 * que se ve bien aunque sea menos vistoso. Preferimos eso a un pie recortado.
 * Si quieres que sobreviva en pantallas bajas, el `pt-cta-top` del pie (140 px)
 * es el primer sitio donde recortar.
 */
export function RevealFooter({ children }: { children: React.ReactNode }) {
  const footer = useRef<HTMLDivElement>(null);
  // 0 = efecto apagado. Nace apagado a propósito: el HTML del servidor es el
  // pie de siempre en su sitio, y el efecto entra al hidratar sin mover nada
  // —el hueco mide justo lo que dejó de ocupar el pie al salirse del flujo—.
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    const node = footer.current;
    if (!node) return;

    function measure() {
      if (!node) return;
      const height = node.offsetHeight;
      setReveal(height > 0 && height <= window.innerHeight ? height : 0);
    }

    measure();
    // El alto del pie cambia con el ancho (el mapa y las columnas reflowean),
    // y el de la ventana con la barra del navegador en móvil. Hacen falta los dos.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const active = reveal > 0;

  // Con el pie fijo detrás de la cortina, tabular hasta sus enlaces enfoca algo
  // que no se ve: el navegador no puede hacer scroll hasta un elemento fijo. Se
  // baja la cortina a mano en cuanto el foco entra.
  function onFocusCapture() {
    if (!active) return;
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <>
      {active && (
        <div aria-hidden style={{ height: reveal }} className="shrink-0" />
      )}
      <div
        ref={footer}
        onFocusCapture={onFocusCapture}
        className={active ? "fixed inset-x-0 bottom-0 z-0" : undefined}
      >
        {children}
      </div>
    </>
  );
}
