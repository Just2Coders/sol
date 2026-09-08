"use client";

import { createContext, useContext, useState } from "react";

import type { KitComparison } from "@/lib/kits/comparison";
import type { KitOffer } from "@/lib/kits/offers";

/**
 * Qué kit está mirando el visitante.
 *
 * Los dos extremos de la elección viven lejos en el documento: los botones
 * están montados a caballo del hero y el resultado, una sección más abajo. Un
 * contexto es lo que los cose sin que ninguno de los dos tenga que conocer al
 * otro ni al orden de la página.
 *
 * Los datos entran una sola vez, desde el servidor, y viajan por aquí: así el
 * cambio de kit es instantáneo —ya está todo en el cliente— y ni el buscador ni
 * la sección de resultados tienen que pedir nada.
 */
type KitSelection = {
  kits: KitComparison[];
  /** El kit que se está mostrando ahora mismo. Nunca es null. */
  kit: KitComparison;
  /** Solo las ofertas del kit seleccionado. */
  offers: KitOffer[];
  select: (slug: string) => void;
  /** El id del bloque que pintan los botones, para el `aria-controls`. */
  panelId: string;
};

const KitSelectionContext = createContext<KitSelection | null>(null);

export const KIT_PANEL_ID = "kits";

export function KitSelectionProvider({
  kits,
  offers,
  children,
}: {
  kits: KitComparison[];
  offers: KitOffer[];
  children: React.ReactNode;
}) {
  // Arranca en el kit marcado en los datos: es la recomendación por defecto
  // hasta que exista el selector de horas de apagón (ver lib/kits/comparison).
  const [selected, setSelected] = useState(
    () => (kits.find((kit) => kit.highlight) ?? kits[0]).slug,
  );

  const kit = kits.find((k) => k.slug === selected) ?? kits[0];

  return (
    <KitSelectionContext
      value={{
        kits,
        kit,
        offers: offers.filter((offer) => offer.kitSlug === kit.slug),
        select: setSelected,
        panelId: KIT_PANEL_ID,
      }}
    >
      {children}
    </KitSelectionContext>
  );
}

export function useKitSelection(): KitSelection {
  const value = useContext(KitSelectionContext);
  if (!value) {
    throw new Error("useKitSelection necesita un <KitSelectionProvider> encima");
  }
  return value;
}
