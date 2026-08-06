import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Los tests cubren la **lógica pura** de `lib/`: las reglas del dominio escritas
 * como funciones que reciben datos y devuelven datos, sin tocar la base ni
 * `next/headers`.
 *
 * Es donde de verdad se puede equivocar uno —qué es vendible, qué precio rige
 * hoy, hasta cuándo aguanta una reserva— y donde un test cuesta una línea. Lo
 * que habla con Postgres se comprueba contra la base de dev con
 * `npm run check:inventory`, que verifica las invariantes; montar una base de
 * pruebas propia es una decisión aparte y todavía no está tomada.
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(import.meta.dirname, ".") },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
