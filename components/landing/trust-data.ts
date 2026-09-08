/**
 * ⚠️ CONTENIDO DE EJEMPLO — ni los equipos ni sus cifras son reales. Las
 * fotos tampoco: son banco de imágenes (Unsplash) subido a Blob, no la obra
 * de ningún equipo real. La página ya no lo rotula como ejemplo en pantalla
 * (se sacó el dateline a pedido) — la única señal de que esto es mock queda
 * en este comentario y en el código.
 *
 * La sección de confianza es el hueco más grave de la landing: el visitante
 * manda cuatro cifras a un desconocido por una instalación física en su casa y
 * hoy la página no le enseña ni un nombre. Estos dos equipos existen para poder
 * juzgar la forma.
 *
 * Cuando existan proveedores de verdad, esto se sustituye por una query sobre
 * `suppliers` + `supplier_zones` en `lib/`, y las fotos por las que manden
 * ellos. Mientras tanto: ni una garantía que nadie ha firmado.
 */

const BLOB_HOST = "https://9lphmnrf8luyomrq.public.blob.vercel-storage.com";

export type TrustPhoto = { alt: string; url: string };

export type TrustTeam = {
  headline: string;
  cta: string;
  /**
   * Las filas de datos del equipo. `checklist` las dibuja con marca de
   * verificación —son lo que incluye— y `rows` como tabla de filetes, que es lo
   * que se consulta dato a dato.
   */
  facts: string[];
  layout: "rows" | "checklist";
  /** Una foto grande, o una tira de varias. */
  photos: TrustPhoto[];
};

export const TRUST_TEAMS: TrustTeam[] = [
  {
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
    photos: [
      {
        alt: "Equipo SolarCaribe instalando paneles al atardecer, Villa Clara",
        url: `${BLOB_HOST}/landing/trust-solarcaribe-team.jpg`,
      },
    ],
  },
  {
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
      { alt: "Cuadrilla en obra, montando la estructura", url: `${BLOB_HOST}/landing/trust-crew-onsite.jpg` },
      { alt: "Panel instalado, techo plano", url: `${BLOB_HOST}/landing/trust-panel-flat-roof.jpg` },
      { alt: "Tablero e inversor de la instalación", url: `${BLOB_HOST}/landing/trust-inverter-panel.jpg` },
      {
        alt: "Entrega y capacitación al cliente",
        url: `${BLOB_HOST}/landing/trust-client-handoff.jpg`,
      },
    ],
  },
];
