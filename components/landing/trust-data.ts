/**
 * ⚠️ CONTENIDO DE EJEMPLO — ni los equipos ni sus cifras son reales.
 *
 * La sección de confianza es el hueco más grave de la landing: el visitante
 * manda cuatro cifras a un desconocido por una instalación física en su casa y
 * hoy la página no le enseña ni un nombre. Estos dos equipos existen para poder
 * juzgar la forma; van rotulados como ejemplo en la propia página —el dateline
 * lo dice— para que nadie los confunda con un proveedor dado de alta.
 *
 * Cuando existan proveedores de verdad, esto se sustituye por una query sobre
 * `suppliers` + `supplier_zones` en `lib/`, y las fotos por las que manden
 * ellos. Mientras tanto: ni una garantía que nadie ha firmado.
 *
 * Las condiciones (`TRUST_TERMS`) sí son afirmaciones que el producto sostiene
 * hoy y no llevan marca de ejemplo.
 */

export type TrustTeam = {
  /** Dónde trabaja y de qué es este bloque. Lleva escrito que es un ejemplo. */
  dateline: string;
  headline: string;
  cta: string;
  /**
   * Las filas de datos del equipo. `checklist` las dibuja con marca de
   * verificación —son lo que incluye— y `rows` como tabla de filetes, que es lo
   * que se consulta dato a dato.
   */
  facts: string[];
  layout: "rows" | "checklist";
  /** Uno o varios huecos de foto: un plano grande, o una tira de cuatro. */
  photos: string[];
};

export const TRUST_TEAMS: TrustTeam[] = [
  {
    dateline: "Villa Clara, Cuba · equipo de ejemplo",
    headline: "SolarCaribe, el equipo que conoce el centro de la isla",
    cta: "Conoce a SolarCaribe",
    layout: "rows",
    facts: [
      "6 técnicos certificados en instalación solar",
      "Cobertura en Villa Clara, Cienfuegos y Sancti Spíritus",
      "Instalación completa en 1 a 2 días",
      "Garantía de equipo: 2 años",
      "Responde en menos de 24 h por WhatsApp",
    ],
    photos: ["[foto: equipo SolarCaribe instalando, Villa Clara]"],
  },
  {
    dateline: "Santiago de Cuba · equipo de ejemplo",
    headline: "Energía Oriente, todo lo que necesita tu instalación",
    cta: "Ver qué incluye",
    layout: "checklist",
    facts: [
      "Paneles monocristalinos de alta eficiencia",
      "Inversor híbrido con monitoreo remoto",
      "Baterías de litio, respaldo real",
      "Estructura de montaje anticorrosiva",
      "Revisión gratuita a los 6 meses",
      "Soporte técnico en español",
    ],
    photos: [
      "[foto] cuadrilla en obra",
      "[foto] panel instalado, techo plano",
      "[foto] tablero e inversor",
      "[foto] entrega y capacitación al cliente",
    ],
  },
];

export type TrustTerm = { question: string; answer: string };

/** Lo que hoy se puede afirmar sobre el trato, en las palabras del comprador. */
export const TRUST_TERMS: TrustTerm[] = [
  {
    question: "quién instala",
    answer: "El proveedor que elijas, con su propio equipo.",
  },
  {
    question: "si algo falla",
    answer: "El proveedor responde por su garantía; Solaris media el reclamo.",
  },
  {
    question: "cómo se paga",
    answer:
      "A Solaris, con factura — nunca en efectivo al instalador, nunca por fuera.",
  },
];
