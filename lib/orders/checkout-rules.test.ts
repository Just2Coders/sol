import { describe, expect, it } from "vitest";
import { DEFAULT_HOLD_HOURS, ZELLE_WINDOW_HOURS } from "@/lib/inventory/holds";
import {
  checkoutWindow,
  partReserves,
  servicesOnUnknownEquipment,
  servicesWithoutEquipment,
  type PartHold,
  type PricedLine,
} from "./checkout-rules";

const AHORA = new Date("2026-09-03T12:00:00Z");
const horasDesdeAhora = (fecha: Date) =>
  (fecha.getTime() - AHORA.getTime()) / (60 * 60 * 1000);

function line(over: Partial<PricedLine> & Pick<PricedLine, "type">): PricedLine {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "algo",
    name: "Algo",
    priceUsd: 100,
    image: null,
    quantity: 1,
    supplierId: "11111111-1111-1111-1111-111111111111",
    supplierSlug: "solaris-oriente",
    supplierName: "Solaris Oriente",
    stock: null,
    equipmentScope: null,
    ...over,
  };
}

function part(over: Partial<PartHold>): PartHold {
  return {
    supplierSlug: "solaris-oriente",
    supplierName: "Solaris Oriente",
    holdHours: null,
    reserves: true,
    ...over,
  };
}

describe("servicesWithoutEquipment", () => {
  it("un OWN sin nada de su proveedor se queda fuera", () => {
    const lines = [
      line({ type: "SERVICE", equipmentScope: "OWN", supplierSlug: "instalaciones-b" }),
      line({ type: "PRODUCT", supplierSlug: "solaris-oriente" }),
    ];
    expect(servicesWithoutEquipment(lines)).toHaveLength(1);
  });

  it("un OWN con equipo de su propio proveedor pasa", () => {
    const lines = [
      line({ type: "SERVICE", equipmentScope: "OWN", supplierSlug: "solaris-oriente" }),
      line({ type: "PRODUCT", supplierSlug: "solaris-oriente" }),
    ];
    expect(servicesWithoutEquipment(lines)).toEqual([]);
  });

  it("un PLATFORM se conforma con equipo de otro proveedor del carrito", () => {
    // Es la validación que cruza grupos: el equipo está en la parte de otro.
    const lines = [
      line({ type: "SERVICE", equipmentScope: "PLATFORM", supplierSlug: "instalaciones-b" }),
      line({ type: "KIT", supplierSlug: "solaris-oriente" }),
    ];
    expect(servicesWithoutEquipment(lines)).toEqual([]);
  });

  it("un PLATFORM en un carrito de puros servicios se queda fuera", () => {
    const lines = [
      line({ type: "SERVICE", equipmentScope: "PLATFORM", supplierSlug: "instalaciones-b" }),
      line({ type: "SERVICE", equipmentScope: "ANY", supplierSlug: "solaris-oriente" }),
    ];
    // Un servicio no instala a otro servicio.
    expect(servicesWithoutEquipment(lines)).toHaveLength(1);
  });

  it("un ANY se contrata a ciegas", () => {
    const lines = [line({ type: "SERVICE", equipmentScope: "ANY" })];
    expect(servicesWithoutEquipment(lines)).toEqual([]);
  });
});

describe("servicesOnUnknownEquipment", () => {
  it("un ANY llega sin que nadie sepa a qué va el instalador", () => {
    const lines = [line({ type: "SERVICE", equipmentScope: "ANY" })];
    expect(servicesOnUnknownEquipment(lines)).toHaveLength(1);
  });

  it("un OWN no hace falta describirlo: su equipo está en el pedido", () => {
    const lines = [
      line({ type: "SERVICE", equipmentScope: "OWN" }),
      line({ type: "PRODUCT" }),
    ];
    expect(servicesOnUnknownEquipment(lines)).toEqual([]);
  });
});

describe("partReserves", () => {
  it("una parte de solo servicios no aparta nada", () => {
    expect(partReserves([line({ type: "SERVICE", equipmentScope: "ANY" })])).toBe(false);
  });

  it("un kit aparta, aunque no tenga stock propio", () => {
    expect(partReserves([line({ type: "KIT" })])).toBe(true);
  });
});

describe("checkoutWindow", () => {
  it("manda el proveedor más impaciente", () => {
    const window = checkoutWindow(
      [
        part({ supplierSlug: "lento", holdHours: 96 }),
        part({ supplierSlug: "impaciente", holdHours: 50 }),
      ],
      AHORA,
    );
    expect(horasDesdeAhora(window.expiresAt)).toBe(50);
    expect(window.tightest?.supplierSlug).toBe("impaciente");
  });

  it("una parte de solo servicios no acorta el plazo de nadie", () => {
    // No retiene mercancía, así que su hold no puede tumbar el pedido antes.
    const window = checkoutWindow(
      [
        part({ supplierSlug: "equipo", holdHours: 96 }),
        part({ supplierSlug: "mano-de-obra", holdHours: 2, reserves: false }),
      ],
      AHORA,
    );
    expect(horasDesdeAhora(window.expiresAt)).toBe(96);
    expect(window.tightest?.supplierSlug).toBe("equipo");
  });

  it("un carrito que no retiene nada cae al default de la plataforma", () => {
    // El caso que se olvida y deja un pedido sin vencimiento.
    const window = checkoutWindow([part({ holdHours: 6, reserves: false })], AHORA);
    expect(horasDesdeAhora(window.expiresAt)).toBe(DEFAULT_HOLD_HOURS);
    expect(window.tightest).toBeNull();
  });

  it("sin partes, tampoco se queda sin fecha", () => {
    expect(horasDesdeAhora(checkoutWindow([], AHORA).expiresAt)).toBe(DEFAULT_HOLD_HOURS);
  });

  it("el empate lo gana la primera parte, que es el orden en que se armó", () => {
    const window = checkoutWindow(
      [part({ supplierSlug: "primero", holdHours: 24 }), part({ supplierSlug: "segundo", holdHours: 24 })],
      AHORA,
    );
    expect(window.tightest?.supplierSlug).toBe("primero");
  });

  it("avisa de quien no cubre el medio de pago más lento", () => {
    const window = checkoutWindow(
      [
        part({ supplierSlug: "corto", holdHours: ZELLE_WINDOW_HOURS - 1 }),
        part({ supplierSlug: "justo", holdHours: ZELLE_WINDOW_HOURS }),
      ],
      AHORA,
    );
    expect(window.short.map((p) => p.supplierSlug)).toEqual(["corto"]);
  });

  it("no avisa de quien no retiene, aunque su hold sea ridículo", () => {
    const window = checkoutWindow([part({ holdHours: 1, reserves: false })], AHORA);
    expect(window.short).toEqual([]);
  });
});
