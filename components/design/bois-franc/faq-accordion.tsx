"use client";

import { useState } from "react";
import { Minus, Plus } from "reicon-react";

import { cn } from "@/lib/utils";

export type FaqItem = { question: string; answer: string };

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
    answer: "Puedes dejarnos tu contacto y te avisamos en cuanto llegue uno a tu zona.",
  },
  {
    question: "¿Qué garantía tienen los equipos?",
    answer: "Depende del proveedor — cada ficha muestra su garantía antes de que confirmes la compra.",
  },
  {
    question: "¿Cómo sé que el proveedor es confiable?",
    answer: "El alta de cada proveedor la hacemos a mano, uno por uno, antes de publicarlo en Solaris.",
  },
];

/**
 * El único bloque de la variante con estado propio: qué pregunta está
 * abierta. Es un acordeón de verdad (a diferencia del boceto en Wonder, que
 * solo podía *dibujar* el primer ítem abierto) — aquí cuesta lo mismo que
 * simularlo, así que no hay razón para dejarlo estático.
 */
export function FaqAccordion({ className }: { className?: string }) {
  const [open, setOpen] = useState<string | null>(FAQ_ITEMS[0].question);

  return (
    <div className={className}>
      {FAQ_ITEMS.map((item) => {
        const expanded = item.question === open;
        return (
          <div key={item.question} className="border-foreground/15 border-t last:border-b">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : item.question)}
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
            >
              <span className={cn("text-heading-3", expanded && "font-bold")}>
                {item.question}
              </span>
              {expanded ? (
                <Minus aria-hidden className="text-muted-foreground size-5 shrink-0" />
              ) : (
                <Plus aria-hidden className="text-muted-foreground size-5 shrink-0" />
              )}
            </button>
            {expanded && (
              <p className="text-muted-foreground text-body-sm max-w-[64ch] pb-6">
                {item.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
