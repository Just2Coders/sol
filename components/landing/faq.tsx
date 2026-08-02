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
      "Por ahora el pago es único, a través de Solaris. Estamos evaluando opciones de financiamiento para más adelante.",
  },
  {
    question: "¿Qué pasa si mi provincia todavía no tiene proveedor?",
    answer:
      "Puedes dejarnos tu contacto y te avisamos en cuanto llegue uno a tu zona.",
  },
  {
    question: "¿Qué garantía tienen los equipos?",
    answer:
      "Depende del proveedor — cada ficha muestra su garantía antes de que confirmes la compra.",
  },
  {
    question: "¿Cómo sé que el proveedor es confiable?",
    answer:
      "El alta de cada proveedor la hacemos a mano, uno por uno, antes de publicarlo en Solaris.",
  },
];

/**
 * Las preguntas, centradas y en una sola columna estrecha.
 *
 * Es la última sección clara antes de los dos bloques de tinta, y la única
 * centrada de toda la página: después de un rato leyendo a dos columnas, un eje
 * único es la señal de que la página está cerrando.
 *
 * El galón cuadrado de la derecha no es decoración: gira al abrir, y es lo
 * único que dice que la fila se puede pulsar. La respuesta abre debajo, dentro
 * del mismo filete, para que la lista no se descuadre.
 */
export function Faq() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="bg-background px-gutter py-section-md flex flex-col items-center">
      <div className="flex w-full flex-col items-center gap-4.5 text-center">
        <p className="bg-primary-loud text-primary-loud-foreground text-marginalia tracking-mono-md px-4 py-2 font-mono uppercase">
          preguntas frecuentes
        </p>
        <h2 className="text-display-2 text-foreground">
          Todo lo que te preguntas.
        </h2>
        <p className="text-body text-foreground max-w-155">
          Sabemos que mandarle dinero a un desconocido para instalar paneles en
          tu techo suena arriesgado. No lo es.
        </p>
      </div>

      <div className="mt-12 w-full max-w-250">
        {FAQ_ITEMS.map((item) => {
          const expanded = item.question === open;

          return (
            <div key={item.question} className="border-foreground border-b">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : item.question)}
                className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
              >
                <span className="text-body text-foreground">
                  {item.question}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "border-foreground text-foreground ease-standard flex size-9 shrink-0 items-center justify-center border transition-transform duration-base",
                    expanded && "rotate-90",
                  )}
                >
                  <ChevronRight className="size-4" />
                </span>
              </button>

              {expanded && (
                <p className="text-body-sm text-muted-foreground max-w-[72ch] px-6 pb-5">
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
