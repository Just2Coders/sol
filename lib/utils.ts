import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
