import { describe, expect, it } from "vitest";
import { formatOrderNumber } from "./numbering";

describe("formatOrderNumber", () => {
  it("le pone la cabecera al valor de la secuencia", () => {
    expect(formatOrderNumber(1042)).toBe("SOL-1042");
  });

  it("rellena con ceros para que todos tengan la misma forma", () => {
    expect(formatOrderNumber(7)).toBe("SOL-0007");
  });

  it("pasados diez mil pedidos crece en vez de truncarse", () => {
    // Truncar a cuatro dígitos haría chocar el 10000 con un número ya emitido,
    // y `order_number` es único.
    expect(formatOrderNumber(10000)).toBe("SOL-10000");
  });
});
