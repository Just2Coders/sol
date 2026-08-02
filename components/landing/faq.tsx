"use client";

import { useState } from "react";
import { ChevronRight } from "reicon-react";

import { cn } from "@/lib/utils";

type FaqItem = { question: string; answer: string };

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "¿Qué pasa si el proveedor no llega el día acordado?",
    answer:
      "Solaris media el reclamo directamente con el proveedor. Si no resuelve, te ayudamos a encontrar otro en tu provincia.",
  },
  {
    question: "¿Los precios incluyen la instalación?",
    answer:
      "Sí. El precio del kit incluye paneles, inversor, baterías e instalación completa por el proveedor.",
  },
  {
    question: "¿Puedo pagar en cuotas?",
    answer:
      "Todavía no. Hoy el pago es único y va a través de Solaris. El financiamiento está en evaluación.",
  },
  {
    question: "¿Qué pasa si mi provincia todavía no tiene proveedor?",
    answer:
      "Déjanos tu contacto y te avisamos en cuanto entre uno a tu zona. No pagas nada por esperar.",
  },
  {
    question: "¿Qué garantía tienen los equipos?",
    answer:
      "Depende del proveedor — cada ficha muestra la suya antes de que confirmes la compra, no después.",
  },
  {
    question: "¿Cómo sé que el proveedor es confiable?",
    answer:
      "El alta de cada proveedor la hacemos a mano, uno por uno, antes de publicarlo. Y el dinero lo cobra Solaris: al proveedor le llega cuando la orden está confirmada.",
  },
];

/**
 * Las preguntas, centradas y en una sola columna estrecha.
 *
 * Es la última sección clara antes de los dos bloques de tinta, y la única
 * centrada de toda la página: después de un rato leyendo a dos columnas, un eje
 * único es la señal de que la página está cerrando.
 *
 * El galón cuadrado de la derecha no es decoración: es lo único que dice que la
 * fila se puede pulsar. Lo que gira al abrir es el galón *dentro* de la caja,
 * no la caja: el filete cuadrado es un objeto de la retícula y girarlo entero
 * lo saca de escuadra con todo lo demás.
 *
 * Las preguntas abren y cierran sueltas —abrir una no cierra las otras—: son
 * dudas independientes, y quien viene a resolver dos no debería perder la
 * primera al mirar la segunda.
 *
 * La fila no lleva padding lateral: el filete de abajo mide exactamente lo que
 * mide la fila, así que la línea arranca donde arranca la pregunta y termina
 * donde termina el galón. Cualquier `px-*` aquí desalinea las tres cosas.
 *
 * Pregunta y respuesta están a dos peldaños de distancia —`heading-3` en tinta
 * contra `body-sm` en muted—, no a uno: entre `body` y `body-sm` hay un píxel
 * de diferencia y abiertas se leían como el mismo párrafo. La pregunta es un
 * `h3` de verdad, que es lo que un lector de pantalla necesita para saltar de
 * una a otra sin recorrerlas enteras.
 *
 * La respuesta abre debajo, dentro del mismo filete, para que la lista no se
 * descuadre. No entra y sale del DOM: crece de `0fr` a `1fr` en una retícula de
 * una fila, que es la única forma de animar una altura automática sin medirla
 * en JS. Cerrada queda `inert`, así que ni el foco ni el lector de pantalla la
 * alcanzan aunque siga escrita.
 */
export function Faq() {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  function toggle(question: string) {
    setOpen((current) => {
      const next = new Set(current);
      // `delete` devuelve si había algo que borrar: si no lo había, se añade.
      if (!next.delete(question)) next.add(question);
      return next;
    });
  }

  return (
    <section className="bg-background px-gutter py-section-md flex flex-col items-center">
      <div className="flex w-full flex-col items-center gap-4.5 text-center">
        {/* Rótulo, no acción: el pastillero redondo es lo que lo separa de los
            CTA de la página, que son campos rectos sin radio. */}
        <p className="bg-primary-loud text-primary-loud-foreground text-marginalia tracking-mono-md rounded-full px-4 py-2 font-mono uppercase">
          preguntas frecuentes
        </p>
        <h2 className="text-display-2 text-foreground">
          Lo que se pregunta todo el mundo.
        </h2>
        <p className="text-body text-foreground max-w-155">
          Mandarle dinero a un desconocido para que te suba al techo suena
          arriesgado. Por eso el dinero entra en Solaris, no en el bolsillo del
          instalador.
        </p>
      </div>

      <div className="mt-12 w-full max-w-250">
        {FAQ_ITEMS.map((item, index) => {
          const expanded = open.has(item.question);
          const panelId = `faq-panel-${index}`;

          return (
            <div key={item.question} className="border-foreground border-b">
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(item.question)}
                  className="text-heading-3 text-foreground flex w-full items-center justify-between gap-6 py-6 text-left"
                >
                  {item.question}
                  <span
                    aria-hidden
                    className="border-foreground text-foreground flex size-9 shrink-0 items-center justify-center border"
                  >
                    <ChevronRight
                      className={cn(
                        "ease-standard size-4 transition-transform duration-slow",
                        expanded && "rotate-90",
                      )}
                    />
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                inert={!expanded}
                className={cn(
                  "ease-standard grid transition-[grid-template-rows] duration-slow",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                {/* El hijo recorta: la fila de 0fr no oculta nada por sí sola. */}
                <div className="overflow-hidden">
                  {/* Más aire debajo que encima: así la respuesta se agrupa con
                      su pregunta y no queda flotando a medio camino del filete
                      siguiente. */}
                  <p
                    className={cn(
                      "text-body-sm text-muted-foreground ease-standard max-w-[72ch] pb-9 transition-opacity duration-slow",
                      expanded ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
