import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Los roles de texto del sistema, tal como están registrados en el `@theme` de
 * app/globals.css. Tienen que estar TODOS aquí; `npm run check:tokens` compara
 * las dos listas y falla si se desincronizan.
 *
 * ── Por qué existe esta lista ──────────────────────────────────────────────
 * `text-` es un prefijo ambiguo: sirve para el color (`text-foreground`) y para
 * el tamaño (`text-display-1`). tailwind-merge lo desambigua por el sufijo, y
 * solo reconoce como tamaño los de la escala de Tailwind (`text-sm`, `text-xl`,
 * un valor arbitrario…). Nuestros roles no se parecen a ninguno, así que los
 * daba por colores — y al fusionar `cn("text-primary-loud-foreground",
 * "text-data")` borraba el color por "repetido", dejando el elemento heredando
 * el color del body. Es un fallo mudo: la clase desaparece del HTML, no hay
 * error, y solo se ve como un botón con la tipografía del color equivocado.
 *
 * Declarándolos aquí, cada uno cae en su grupo: dos tamaños siguen pisándose
 * entre sí, dos colores también, y un tamaño y un color ya no se tocan.
 */
export const TEXT_ROLES = [
  "display-1",
  "display-2",
  "display-3",
  "display-4",
  "wordmark",
  "brand",
  "heading-1",
  "heading-2",
  "heading-3",
  "body-lg",
  "body",
  "body-sm",
  "body-xs",
  "caption",
  "label",
  "marginalia",
  "micro",
  "data",
  "button",
  "nav",
] as const

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: [...TEXT_ROLES] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "Panel Solar 450W" → "panel-solar-450w". Para slugs de zonas, proveedores, etc.
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Precios: $1,699 y $1,699.50. Los centavos solo aparecen si los hay — en un
// listado de kits las columnas de ",00" son ruido.
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(value: number): string {
  return Number.isInteger(value) ? usdWhole.format(value) : usdCents.format(value);
}

// Acepta solo rutas internas ("/checkout", nunca "//evil.com" ni "https://...")
// para usar valores de ?from= como destino de redirección sin open redirect.
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value;
}
