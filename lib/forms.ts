import * as z from "zod";

/**
 * Primitivos de validación compartidos por las Server Actions del panel admin.
 *
 * Vive fuera de `lib/db` a propósito: son schemas puros (sin acceso a BD ni a
 * sesión), así que también los puede importar el cliente si hiciera falta.
 * Ver ARCHITECTURE §3 — la validación va en el borde de cada Action.
 */

/** Estado que devuelven todas las Actions de formularios del admin. */
export type ActionState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: boolean;
    }
  | undefined;

export const idSchema = z.uuid();

/** Campo de texto opcional: "" → undefined (para columnas nullable). */
export const optionalText = z
  .string()
  .trim()
  .transform((s) => s || undefined)
  .optional();

/**
 * Dinero en USD para columnas `numeric(10,2)`.
 *
 * Se valida como texto y se convierte al final: así se rechazan entradas como
 * "12.999" o "abc" antes de que lleguen a Postgres. `numeric(10,2)` admite
 * hasta 8 dígitos enteros, de ahí el tope.
 */
export const priceUsdSchema = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/, {
    error: "Monto inválido. Usa hasta 2 decimales (ej. 185.50).",
  })
  .transform((s) => Number(s.replace(",", ".")))
  .refine((n) => n > 0, { error: "El precio debe ser mayor que 0." })
  .refine((n) => n <= 99_999_999.99, { error: "El precio es demasiado alto." });

/** Cantidades en unidades enteras (stock, cantidad dentro de un kit). */
export const quantitySchema = (min: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, { error: "Debe ser un número entero." })
    .transform(Number)
    .refine((n) => n >= min, { error: `El mínimo es ${min}.` })
    .refine((n) => n <= 1_000_000, { error: "El valor es demasiado alto." });

/** Textarea de "una entrada por línea" → array limpio y sin duplicados. */
export function parseLines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return [...new Set(lines)];
}

/** Galería de imágenes: una URL por línea. */
export const imageUrlsSchema = z
  .array(z.url({ error: "Cada imagen debe ser una URL válida (https://...)." }))
  .max(10, { error: "Máximo 10 imágenes." });

/**
 * Ficha técnica libre: líneas "clave: valor" → `{ clave: "valor" }`.
 * Coincide con la forma de `products.specs` (jsonb `Record<string, string>`).
 */
export const specsSchema = z
  .string()
  .transform((raw) =>
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  )
  .superRefine((lines, ctx) => {
    for (const line of lines) {
      const separator = line.indexOf(":");
      const key = separator === -1 ? "" : line.slice(0, separator).trim();
      const value = separator === -1 ? "" : line.slice(separator + 1).trim();
      if (!key || !value) {
        ctx.addIssue({
          code: "custom",
          message: `Formato inválido en «${line}». Usa "clave: valor".`,
        });
      }
    }
  })
  .transform((lines) =>
    Object.fromEntries(
      lines.map((line) => {
        const separator = line.indexOf(":");
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim(),
        ];
      }),
    ),
  );

/** `{ potencia: "450W" }` → "potencia: 450W", para rellenar el textarea. */
export function specsToText(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}
