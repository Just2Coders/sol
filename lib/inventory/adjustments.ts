/**
 * Las reglas de un ajuste de stock, en puro.
 *
 * Un movimiento del libro mayor lleva **delta**, no un total: es lo que permite
 * que el saldo sea la suma y que el histórico explique cómo se llegó hasta aquí.
 * Pero a un almacén no se le pregunta "¿cuánto ha cambiado?", se le pregunta
 * "¿cuánto hay?" — así que el formulario recoge un recuento y la diferencia se
 * calcula aquí.
 */

/** Lo máximo que admite un movimiento. No es negocio, es un seguro tipográfico. */
export const MAX_MOVEMENT = 1_000_000;

/**
 * El delta que lleva del saldo actual al que se ha contado.
 *
 * Cero es una respuesta válida y significativa: "conté y estaba bien". Quien
 * llama decide si eso merece una fila en el libro o no.
 */
export function deltaForCount(currentStock: number, countedUnits: number): number {
  return countedUnits - currentStock;
}

/** El saldo que dejaría este movimiento. */
export function resultingStock(currentStock: number, delta: number): number {
  return currentStock + delta;
}

export type AdjustmentProblem =
  | "empty"
  | "negative-result"
  | "too-large"
  | "not-integer";

/**
 * ¿Se puede escribir este movimiento?
 *
 * La única regla de fondo es que **el saldo no puede quedar negativo**: un
 * almacén con −3 paneles no significa nada, y si el libro lo admitiera la
 * invariante seguiría cuadrando mientras la tienda enseña un imposible.
 *
 * Un delta de cero se rechaza como `empty`, no como error: no hay nada que
 * anotar, y una fila que no cambia nada solo ensucia el histórico.
 */
export function checkAdjustment(
  currentStock: number,
  delta: number,
): AdjustmentProblem | null {
  if (!Number.isInteger(delta)) return "not-integer";
  if (delta === 0) return "empty";
  if (Math.abs(delta) > MAX_MOVEMENT) return "too-large";
  if (resultingStock(currentStock, delta) < 0) return "negative-result";
  return null;
}

/** El mismo problema, dicho para quien rellena el formulario. */
export const ADJUSTMENT_MESSAGE: Record<AdjustmentProblem, string> = {
  empty: "Ese es el saldo que ya había: no hay nada que anotar.",
  "negative-result": "El almacén no puede quedar en negativo.",
  "too-large": "La cantidad es demasiado alta.",
  "not-integer": "Las unidades van enteras.",
};

export type RestockWindowInput = {
  /** `YYYY-MM-DD` */
  etaFrom: string;
  /** `YYYY-MM-DD` */
  etaTo: string;
};

export type RestockProblem = "backwards" | "past" | "too-far";

/** Un anuncio a más de un año vista no es una previsión, es un deseo. */
export const MAX_RESTOCK_DAYS = 365;

/**
 * ¿Tiene sentido esta ventana?
 *
 * Tres formas de escribirla mal, y las tres se dan: al revés, en el pasado —un
 * anuncio que nace caducado no lo vería nadie— y tan lejos que no informa.
 *
 * Que la ventana sea **ancha** no es un error: eso es precisamente decir "no
 * estoy seguro", que es lo que se quiere poder decir.
 */
export function checkRestockWindow(
  { etaFrom, etaTo }: RestockWindowInput,
  today: string,
): RestockProblem | null {
  if (etaTo < etaFrom) return "backwards";
  if (etaTo < today) return "past";
  if (daysBetween(today, etaTo) > MAX_RESTOCK_DAYS) return "too-far";
  return null;
}

export const RESTOCK_MESSAGE: Record<RestockProblem, string> = {
  backwards: "La fecha final va después de la inicial.",
  past: "Esa ventana ya pasó: nadie la vería.",
  "too-far": "Demasiado lejos para anunciarlo como una reposición.",
};

/** Días enteros entre dos `YYYY-MM-DD`. Negativo si el segundo va antes. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
