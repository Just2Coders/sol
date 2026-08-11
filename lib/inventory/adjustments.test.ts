import { describe, expect, it } from "vitest";
import {
  checkAdjustment,
  checkRestockWindow,
  daysBetween,
  deltaForCount,
  MAX_MOVEMENT,
  MAX_RESTOCK_DAYS,
  resultingStock,
} from "./adjustments";

const HOY = "2026-08-06";

describe("deltaForCount", () => {
  it("contar menos de lo que decía el libro da un delta negativo", () => {
    // Merma, rotura o un recuento anterior mal hecho.
    expect(deltaForCount(15, 12)).toBe(-3);
  });

  it("contar más da un delta positivo", () => {
    expect(deltaForCount(10, 14)).toBe(4);
  });

  it("contar lo mismo da cero, que también es una respuesta", () => {
    expect(deltaForCount(10, 10)).toBe(0);
  });

  it("contar cero sobre un almacén lleno vacía el saldo entero", () => {
    expect(deltaForCount(8, 0)).toBe(-8);
  });
});

describe("resultingStock", () => {
  it("suma el delta al saldo", () => {
    expect(resultingStock(10, 5)).toBe(15);
    expect(resultingStock(10, -4)).toBe(6);
  });
});

describe("checkAdjustment", () => {
  it("acepta un movimiento normal", () => {
    expect(checkAdjustment(10, 5)).toBe(null);
    expect(checkAdjustment(10, -4)).toBe(null);
  });

  it("dejar el almacén exactamente a cero es legítimo", () => {
    // Es el borde: se acabaron, no es un error.
    expect(checkAdjustment(8, -8)).toBe(null);
  });

  it("no deja el almacén en negativo", () => {
    // Cuadraría la invariante y a la vez enseñaría un imposible.
    expect(checkAdjustment(8, -9)).toBe("negative-result");
  });

  it("un delta de cero no se anota", () => {
    // Una fila que no cambia nada solo ensucia el histórico.
    expect(checkAdjustment(10, 0)).toBe("empty");
  });

  it("rechaza cantidades absurdas en los dos sentidos", () => {
    expect(checkAdjustment(10, MAX_MOVEMENT + 1)).toBe("too-large");
    expect(checkAdjustment(10_000_000, -(MAX_MOVEMENT + 1))).toBe("too-large");
  });

  it("acepta justo el tope", () => {
    expect(checkAdjustment(0, MAX_MOVEMENT)).toBe(null);
  });

  it("las unidades van enteras", () => {
    expect(checkAdjustment(10, 1.5)).toBe("not-integer");
  });

  it("mira el resultado antes que el tamaño", () => {
    // Sobre un almacén vacío, restar es imposible aunque el número sea pequeño.
    expect(checkAdjustment(0, -1)).toBe("negative-result");
  });
});

describe("checkRestockWindow", () => {
  it("acepta una ventana normal", () => {
    expect(checkRestockWindow({ etaFrom: "2026-08-10", etaTo: "2026-08-15" }, HOY)).toBe(
      null,
    );
  });

  it("acepta una ventana ancha: eso es decir 'no estoy seguro'", () => {
    // La anchura es la incertidumbre, no un error de carga.
    expect(checkRestockWindow({ etaFrom: "2026-08-10", etaTo: "2026-10-30" }, HOY)).toBe(
      null,
    );
  });

  it("acepta un solo día cuando el proveedor está seguro", () => {
    expect(checkRestockWindow({ etaFrom: "2026-08-20", etaTo: "2026-08-20" }, HOY)).toBe(
      null,
    );
  });

  it("rechaza la ventana escrita al revés", () => {
    expect(checkRestockWindow({ etaFrom: "2026-08-20", etaTo: "2026-08-10" }, HOY)).toBe(
      "backwards",
    );
  });

  it("rechaza la que nace caducada", () => {
    // Nadie la vería: el catálogo solo enseña las que no han pasado.
    expect(checkRestockWindow({ etaFrom: "2026-07-01", etaTo: "2026-08-05" }, HOY)).toBe(
      "past",
    );
  });

  it("una ventana que termina hoy todavía vale", () => {
    expect(checkRestockWindow({ etaFrom: "2026-08-01", etaTo: HOY }, HOY)).toBe(null);
  });

  it("acepta una que empezó antes de hoy pero sigue abierta", () => {
    // "Entre el 1 y el 15" el día 6 sigue siendo una promesa viva.
    expect(checkRestockWindow({ etaFrom: "2026-08-01", etaTo: "2026-08-15" }, HOY)).toBe(
      null,
    );
  });

  it("rechaza lo que está a más de un año", () => {
    expect(checkRestockWindow({ etaFrom: "2027-09-01", etaTo: "2027-09-10" }, HOY)).toBe(
      "too-far",
    );
  });

  it("acepta justo el límite del año", () => {
    const limite = "2027-08-06"; // 365 días exactos
    expect(checkRestockWindow({ etaFrom: limite, etaTo: limite }, HOY)).toBe(null);
  });

  it("mira primero que la ventana no esté del revés", () => {
    // Con las dos cosas mal, lo que hay que decirle es lo primero.
    expect(checkRestockWindow({ etaFrom: "2026-07-20", etaTo: "2026-07-01" }, HOY)).toBe(
      "backwards",
    );
  });
});

describe("daysBetween", () => {
  it("cuenta días enteros", () => {
    expect(daysBetween("2026-08-06", "2026-08-16")).toBe(10);
  });

  it("el mismo día son cero", () => {
    expect(daysBetween("2026-08-06", "2026-08-06")).toBe(0);
  });

  it("hacia atrás cuenta negativo", () => {
    expect(daysBetween("2026-08-06", "2026-08-01")).toBe(-5);
  });

  it("cruza el cambio de mes y el de año", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toBe(3);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("un año exacto son 365 días", () => {
    expect(daysBetween("2026-08-06", "2027-08-06")).toBe(MAX_RESTOCK_DAYS);
  });
});
