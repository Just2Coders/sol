/**
 * La reposición prometida, en funciones puras.
 *
 * Lo que existe y lo que se promete no comparten tabla: el stock actual es un
 * hecho verificable y esto es una intención con fecha borrosa. Y la
 * incertidumbre es **estructural** —una ventana, no una fecha—, porque si
 * quedara en una nota al pie de la UI acabaríamos enseñando promesas.
 */

/** Un anuncio, reducido a lo que decide si se enseña y hasta cuándo. */
export type RestockWindow = {
  status: "ANNOUNCED" | "ARRIVED" | "CANCELLED" | "EXPIRED";
  /** Día más temprano en que podría llegar (`YYYY-MM-DD`). */
  etaFrom: string;
  /** Día más tardío (`YYYY-MM-DD`). Pasado ese día, el anuncio ya no vale. */
  etaTo: string;
};

/** Hoy en `YYYY-MM-DD`, para comparar contra una columna `date` sin zona. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * ¿Se le puede enseñar este anuncio a un comprador?
 *
 * Dos condiciones y las dos importan: que siga anunciado, y que su ventana no
 * haya pasado. Lo segundo es lo que hace que un anuncio olvidado **desaparezca
 * solo** — nadie va a entrar a limpiarlo, y "vuelve la semana que viene" escrito
 * hace un mes hace más daño que no decir nada.
 *
 * La comparación es por día, no por instante: la promesa es de días y `date` en
 * Postgres no lleva zona. El día del `etaTo` todavía cuenta.
 */
export function isRestockVisible(restock: RestockWindow, today: string): boolean {
  return restock.status === "ANNOUNCED" && restock.etaTo >= today;
}

/**
 * Cuándo vuelve un producto: la ventana más temprana de las que siguen en pie.
 *
 * Si hay dos reposiciones anunciadas, lo que le importa a quien espera es la
 * primera. `null` cuando no hay ninguna válida, que es "no prometemos nada".
 */
export function soonestRestock<T extends RestockWindow>(
  restocks: T[],
  today: string,
): T | null {
  const visibles = restocks.filter((restock) => isRestockVisible(restock, today));
  if (visibles.length === 0) return null;

  return visibles.reduce((soonest, restock) =>
    restock.etaFrom < soonest.etaFrom ? restock : soonest,
  );
}

/**
 * Cuándo vuelve un **kit**, que es una derivada como su disponibilidad.
 *
 * Un kit está por volver cuando a todas las piezas que le faltan les espera una
 * reposición, y llega cuando llegue **la última** de ellas: de nada sirve que
 * los paneles entren el martes si la batería no viene hasta el día 20.
 *
 * `null` si a alguna pieza que falta no le espera nada — entonces el kit no
 * promete: sale agotado y punto. Es la diferencia entre "vuelve pronto" y "no
 * sabemos", y confundirlas es exactamente lo que erosiona la confianza.
 */
export function kitRestockWindow(
  missing: { restocks: RestockWindow[] }[],
  today: string,
): { etaFrom: string; etaTo: string } | null {
  if (missing.length === 0) return null;

  let etaFrom = "";
  let etaTo = "";

  for (const component of missing) {
    const next = soonestRestock(component.restocks, today);
    if (!next) return null;
    // Manda la pieza que más tarda, en los dos extremos de la ventana.
    if (next.etaFrom > etaFrom) etaFrom = next.etaFrom;
    if (next.etaTo > etaTo) etaTo = next.etaTo;
  }

  return { etaFrom, etaTo };
}

/**
 * ¿Le toca al cron marcar este anuncio como caducado?
 *
 * Distinto de `isRestockVisible`: el catálogo deja de enseñarlo el día siguiente
 * a su ventana, pero la fila se marca `EXPIRED` para que el proveedor la vea en
 * su lista y la resuelva. Ocultar no es cerrar.
 */
export function hasExpired(restock: RestockWindow, today: string): boolean {
  return restock.status === "ANNOUNCED" && restock.etaTo < today;
}
