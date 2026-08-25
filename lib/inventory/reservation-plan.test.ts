import { describe, expect, it } from "vitest";
import {
  reservationPlan,
  type KitPiece,
  type ReservableLine,
} from "./reservation-plan";

const producto = (id: string, quantity = 1): ReservableLine => ({
  type: "PRODUCT",
  id,
  quantity,
});
const kit = (id: string, quantity = 1): ReservableLine => ({
  type: "KIT",
  id,
  quantity,
});
const servicio = (id: string, quantity = 1): ReservableLine => ({
  type: "SERVICE",
  id,
  quantity,
});

const composiciones = (entries: Record<string, KitPiece[]>) =>
  new Map(Object.entries(entries));

describe("reservationPlan", () => {
  it("un producto suelto retiene lo pedido", () => {
    const { intents } = reservationPlan([producto("panel", 3)], new Map());
    expect(intents).toEqual([{ productId: "panel", units: 3 }]);
  });

  it("un kit no retiene el kit: retiene sus piezas", () => {
    const { intents } = reservationPlan(
      [kit("k1")],
      composiciones({
        k1: [
          { productId: "panel", quantity: 4 },
          { productId: "inversor", quantity: 1 },
        ],
      }),
    );
    expect(intents).toEqual([
      { productId: "inversor", units: 1 },
      { productId: "panel", units: 4 },
    ]);
  });

  it("dos kits de cuatro paneles son ocho paneles", () => {
    const { intents } = reservationPlan(
      [kit("k1", 2)],
      composiciones({ k1: [{ productId: "panel", quantity: 4 }] }),
    );
    expect(intents).toEqual([{ productId: "panel", units: 8 }]);
  });

  it("el mismo producto suelto y dentro de un kit se suma en una intención", () => {
    // El caso que rompe la version ingenua: dos filas para el mismo producto
    // significarian dos `UPDATE` y una de las dos podria fallar sola.
    const { intents } = reservationPlan(
      [producto("panel", 2), kit("k1")],
      composiciones({ k1: [{ productId: "panel", quantity: 4 }] }),
    );
    expect(intents).toEqual([{ productId: "panel", units: 6 }]);
  });

  it("un servicio no retiene nada", () => {
    const { intents } = reservationPlan([servicio("instalacion", 5)], new Map());
    expect(intents).toEqual([]);
  });

  it("un carrito vacío no retiene nada", () => {
    expect(reservationPlan([], new Map())).toEqual({
      intents: [],
      unknownKits: [],
    });
  });

  it("un carrito solo de servicios tampoco", () => {
    // Es el caso que deja un pedido sin reservas y por tanto sin vencimiento.
    const { intents } = reservationPlan(
      [servicio("a"), servicio("b")],
      new Map(),
    );
    expect(intents).toEqual([]);
  });

  it("el orden es el mismo vengan las líneas como vengan", () => {
    // La propiedad que evita el interbloqueo entre dos checkouts simultáneos.
    const compos = composiciones({ k1: [{ productId: "aaa", quantity: 1 }] });
    const uno = reservationPlan([producto("zzz"), producto("mmm"), kit("k1")], compos);
    const otro = reservationPlan([kit("k1"), producto("mmm"), producto("zzz")], compos);
    expect(uno.intents).toEqual(otro.intents);
    expect(uno.intents.map((i) => i.productId)).toEqual(["aaa", "mmm", "zzz"]);
  });

  it("un kit de composición desconocida se denuncia, no se ignora", () => {
    // Ignorarlo retendría de menos, que es como se vende lo que no hay.
    const { intents, unknownKits } = reservationPlan([kit("fantasma")], new Map());
    expect(intents).toEqual([]);
    expect(unknownKits).toEqual(["fantasma"]);
  });

  it("un kit desconocido repetido se denuncia una sola vez", () => {
    const { unknownKits } = reservationPlan(
      [kit("fantasma"), kit("fantasma", 2)],
      new Map(),
    );
    expect(unknownKits).toEqual(["fantasma"]);
  });

  it("lo que sí se conoce se retiene aunque otro kit falle", () => {
    const { intents, unknownKits } = reservationPlan(
      [producto("panel", 2), kit("fantasma")],
      new Map(),
    );
    expect(intents).toEqual([{ productId: "panel", units: 2 }]);
    expect(unknownKits).toEqual(["fantasma"]);
  });

  it("una línea de cantidad cero no retiene nada", () => {
    const { intents } = reservationPlan([producto("panel", 0)], new Map());
    expect(intents).toEqual([]);
  });

  it("un kit vacío no retiene nada y tampoco es desconocido", () => {
    // Distinto de "no sé qué lleva": este sí se conoce, y no lleva nada.
    const { intents, unknownKits } = reservationPlan(
      [kit("vacio")],
      composiciones({ vacio: [] }),
    );
    expect(intents).toEqual([]);
    expect(unknownKits).toEqual([]);
  });

  it("dos kits distintos que comparten pieza la suman", () => {
    const { intents } = reservationPlan(
      [kit("k1"), kit("k2")],
      composiciones({
        k1: [{ productId: "panel", quantity: 4 }],
        k2: [{ productId: "panel", quantity: 2 }, { productId: "bateria", quantity: 1 }],
      }),
    );
    expect(intents).toEqual([
      { productId: "bateria", units: 1 },
      { productId: "panel", units: 6 },
    ]);
  });
});
