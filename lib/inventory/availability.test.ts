import { describe, expect, it } from "vitest";
import {
  availableUnits,
  kitAvailableUnits,
  missingComponents,
  type KitComponent,
} from "./availability";

describe("availableUnits", () => {
  it("descuenta lo reservado del almacén", () => {
    expect(availableUnits({ stock: 10, reserved: 3 })).toBe(7);
  });

  it("sin reservas, todo el almacén está disponible", () => {
    expect(availableUnits({ stock: 5, reserved: 0 })).toBe(5);
  });

  it("da cero cuando todo está comprometido", () => {
    expect(availableUnits({ stock: 4, reserved: 4 })).toBe(0);
  });

  it("da cero, y no un negativo, si las reservas superan al almacén", () => {
    // Es un descuadre —lo caza `check:inventory`—, pero mientras tanto la tienda
    // no puede contestar "-2 disponibles".
    expect(availableUnits({ stock: 2, reserved: 4 })).toBe(0);
  });

  it("un almacén vacío no vende nada", () => {
    expect(availableUnits({ stock: 0, reserved: 0 })).toBe(0);
  });
});

describe("kitAvailableUnits", () => {
  const panel = (stock: number, reserved = 0): KitComponent => ({
    stock,
    reserved,
    quantity: 1,
  });

  it("manda la pieza más escasa", () => {
    expect(
      kitAvailableUnits([panel(10), panel(1), panel(4)]),
    ).toBe(1);
  });

  it("divide por cuántas piezas lleva el kit", () => {
    // 10 paneles, 4 por kit → 2 kits, y sobran 2 paneles.
    expect(kitAvailableUnits([{ stock: 10, reserved: 0, quantity: 4 }])).toBe(2);
  });

  it("cuenta lo reservado, no solo el almacén", () => {
    // 10 en almacén pero 8 comprometidos: solo quedan 2 para armar kits de 1.
    expect(kitAvailableUnits([{ stock: 10, reserved: 8, quantity: 1 }])).toBe(2);
  });

  it("una sola pieza agotada deja el kit a cero", () => {
    expect(kitAvailableUnits([panel(50), panel(0), panel(50)])).toBe(0);
  });

  it("no arma kits a medias: 3 paneles para un kit de 2 son 1 kit", () => {
    expect(kitAvailableUnits([{ stock: 3, reserved: 0, quantity: 2 }])).toBe(1);
  });

  it("un kit sin piezas no se puede armar", () => {
    // El caso que tienta a devolver infinito. Un kit vacío es un error de carga,
    // no una existencia sin límite.
    expect(kitAvailableUnits([])).toBe(0);
  });

  it("ignora las piezas que el kit no necesita", () => {
    // `quantity: 0` no aporta escasez, y dividir por cero no significa nada.
    expect(
      kitAvailableUnits([panel(5), { stock: 0, reserved: 0, quantity: 0 }]),
    ).toBe(5);
  });

  it("un kit con solo piezas de cantidad cero tampoco se arma", () => {
    expect(kitAvailableUnits([{ stock: 9, reserved: 0, quantity: 0 }])).toBe(0);
  });

  it("es el bug que existe hoy: un kit cuyos paneles se acabaron no se vende", () => {
    // `catalog/queries.ts` pone hoy `stock: 1` fijo en la rama de kits, así que
    // este caso se vendía igual. Es la razón de que esta función exista.
    const sinPaneles = [
      { stock: 0, reserved: 0, quantity: 6 },
      { stock: 3, reserved: 0, quantity: 1 },
    ];
    expect(kitAvailableUnits(sinPaneles)).toBe(0);
  });
});

describe("missingComponents", () => {
  it("nombra solo lo que falta", () => {
    const piezas = [
      { id: "panel", stock: 0, reserved: 0, quantity: 6 },
      { id: "inversor", stock: 3, reserved: 0, quantity: 1 },
      { id: "bateria", stock: 1, reserved: 1, quantity: 1 },
    ];
    expect(missingComponents(piezas).map((c) => c.id)).toEqual([
      "panel",
      "bateria",
    ]);
  });

  it("con todo en pie no falta nada", () => {
    expect(
      missingComponents([
        { stock: 6, reserved: 0, quantity: 6 },
        { stock: 2, reserved: 0, quantity: 1 },
      ]),
    ).toEqual([]);
  });

  it("falta lo que no llega a completar un kit entero", () => {
    // 5 unidades para un kit que necesita 6: falta, aunque haya existencias.
    expect(
      missingComponents([{ stock: 5, reserved: 0, quantity: 6 }]),
    ).toHaveLength(1);
  });
});
