/**
 * ⚠️ CONTENIDO MARCADOR — nada de esto es real.
 *
 * La sección de confianza es el hueco más grave de la landing: el visitante
 * manda cuatro cifras a un desconocido por una instalación física en su casa y
 * hoy la página no le enseña ni un nombre. Las tres exploraciones la incluyen
 * para poder juzgar la forma; el contenido va deliberadamente rotulado con
 * corchetes para que nadie lo confunda con un dato y para que no se pueda
 * publicar por descuido.
 *
 * Cuando existan proveedores de verdad, esto se sustituye por una query sobre
 * `suppliers` + `supplier_zones` en `lib/`, y las fotos por las que manden
 * ellos. Mientras tanto: ni un nombre real, ni una cifra inventada, ni una
 * garantía que nadie ha firmado.
 */

export const PLACEHOLDER_NOTICE =
  "sección de ejemplo · los datos reales están por llegar";

export type PlaceholderSupplier = {
  /** Rotulado con corchetes a propósito: es un hueco, no un nombre. */
  name: string;
  province: string;
  /** La fecha de alta, que es lo que da antigüedad a una ficha de proveedor. */
  joined: string;
  /** Qué hace: armar kits, instalar, o las dos cosas. */
  trade: string;
};

export const PLACEHOLDER_SUPPLIERS: PlaceholderSupplier[] = [
  {
    name: "[proveedor 01]",
    province: "La Habana",
    joined: "alta ene 2026",
    trade: "arma kits e instala",
  },
  {
    name: "[proveedor 02]",
    province: "Villa Clara",
    joined: "alta feb 2026",
    trade: "instala",
  },
  {
    name: "[proveedor 03]",
    province: "Holguín",
    joined: "alta mar 2026",
    trade: "arma kits",
  },
  {
    name: "[proveedor 04]",
    province: "Santiago de Cuba",
    joined: "alta abr 2026",
    trade: "arma kits e instala",
  },
];

export type PlaceholderCount = {
  value: string;
  label: string;
  /** `false` cuando la cifra es un hueco y no un dato del sistema. */
  real: boolean;
};

/**
 * El conteo de provincias sí sale de `getProvinceCoverage()` y por eso lo pone
 * cada variante; el de kits instalados no existe todavía en ninguna tabla, así
 * que se queda en corchetes.
 */
export const PLACEHOLDER_KITS_COUNT: PlaceholderCount = {
  value: "[000]",
  label: "kits instalados",
  real: false,
};

export const PLACEHOLDER_PHOTO = "[foto: instalación real, Villa Clara]";

export type TrustTerm = {
  /** La pregunta, en las palabras del comprador. */
  question: string;
  /** Lo que hoy se puede afirmar. Vacío cuando todavía no se puede afirmar nada. */
  answer: string;
  /** Lo que falta por definir, siempre visible: no se disimula. */
  pending?: string;
};

export const TRUST_TERMS: TrustTerm[] = [
  {
    question: "quién instala",
    answer: "El proveedor de tu provincia, no Solaris.",
  },
  {
    question: "qué pasa si falla",
    answer: "",
    pending: "[por definir — aquí va la garantía que dé el proveedor]",
  },
  {
    question: "cómo se paga",
    answer: "El cobro y la factura los llevamos nosotros.",
    pending: "[por definir — el método de pago y cuándo se cobra]",
  },
];
