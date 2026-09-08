import { describe, expect, it } from "vitest";
import {
  confirmationProgress,
  isPartDecidable,
  isPartLive,
  liveTotalUsd,
  needsBuyerDecision,
  nextOrderStatus,
  paymentGate,
  partOutcome,
} from "./decisions";

type Status = Parameters<typeof isPartLive>[0];

const part = (status: Status, subtotalUsd = 100) => ({ status, subtotalUsd });

describe("isPartLive", () => {
  it("una parte entregada sigue contando: se entregó, y hay que pagarla", () => {
    expect(isPartLive("DELIVERED")).toBe(true);
  });

  it("una vencida no cuenta aunque el proveedor la hubiera aceptado", () => {
    expect(isPartLive("EXPIRED")).toBe(false);
  });
});

describe("isPartDecidable", () => {
  it("solo se decide la que nadie ha resuelto", () => {
    expect(isPartDecidable("PENDING")).toBe(true);
  });

  it("una ya confirmada no se vuelve a confirmar", () => {
    expect(isPartDecidable("CONFIRMED")).toBe(false);
  });
});

describe("liveTotalUsd", () => {
  it("no suma las partes caídas", () => {
    expect(liveTotalUsd([part("CONFIRMED", 300), part("DECLINED", 200)])).toBe(300);
  });

  it("un pedido sin ninguna parte viva vale cero, no el total original", () => {
    expect(liveTotalUsd([part("DECLINED", 300), part("EXPIRED", 200)])).toBe(0);
  });

  it("redondea al céntimo: tres subtotales en coma flotante dejan cola", () => {
    expect(liveTotalUsd([part("PENDING", 0.1), part("PENDING", 0.2)])).toBe(0.3);
  });
});

describe("confirmationProgress", () => {
  it("cuenta las respondidas sobre las vivas", () => {
    const parts = [part("CONFIRMED"), part("PENDING"), part("PENDING")];
    expect(confirmationProgress(parts)).toEqual({ answered: 1, live: 3, allAnswered: false });
  });

  it("la parte que se cayó sale del denominador, o el marcador no se completaría nunca", () => {
    const parts = [part("CONFIRMED"), part("DECLINED")];
    expect(confirmationProgress(parts)).toEqual({ answered: 1, live: 1, allAnswered: true });
  });

  it("sin partes vivas se da por respondido: no queda nadie a quien esperar", () => {
    expect(confirmationProgress([part("EXPIRED")]).allAnswered).toBe(true);
  });
});

describe("paymentGate", () => {
  it("deja cobrar cuando todos confirmaron y el total es el aceptado", () => {
    const parts = [part("CONFIRMED", 300), part("DELIVERED", 200)];
    expect(paymentGate({ parts, acknowledgedTotalUsd: 500 })).toEqual({ ok: true });
  });

  it("no deja cobrar con un proveedor todavía sin contestar", () => {
    const parts = [part("CONFIRMED", 300), part("PENDING", 200)];
    expect(paymentGate({ parts, acknowledgedTotalUsd: 500 })).toEqual({
      ok: false,
      reason: "AWAITING_SUPPLIERS",
      pending: 1,
    });
  });

  it("no deja cobrar mientras el comprador no haya aceptado el total nuevo", () => {
    const parts = [part("CONFIRMED", 300), part("DECLINED", 200)];
    expect(paymentGate({ parts, acknowledgedTotalUsd: 500 })).toEqual({
      ok: false,
      reason: "TOTAL_CHANGED",
      liveTotalUsd: 300,
      acknowledgedTotalUsd: 500,
    });
  });

  it("una parte pendiente pesa más que el total descuadrado: primero se sabe cuánto queda", () => {
    const parts = [part("PENDING", 300), part("DECLINED", 200)];
    expect(paymentGate({ parts, acknowledgedTotalUsd: 500 })).toMatchObject({
      reason: "AWAITING_SUPPLIERS",
    });
  });

  it("un pedido sin nada vivo no se cobra aunque los números cuadren en cero", () => {
    expect(paymentGate({ parts: [part("DECLINED", 500)], acknowledgedTotalUsd: 0 })).toEqual({
      ok: false,
      reason: "NOTHING_LIVE",
    });
  });
});

describe("nextOrderStatus", () => {
  it("cancela el pedido cuando se cayó la última parte que quedaba", () => {
    const parts = [part("DECLINED"), part("EXPIRED")];
    expect(nextOrderStatus({ current: "PENDING_PAYMENT", parts })).toBe("CANCELLED");
  });

  it("no lo toca mientras le quede una parte en pie", () => {
    const parts = [part("DECLINED"), part("CONFIRMED")];
    expect(nextOrderStatus({ current: "PENDING_PAYMENT", parts })).toBeNull();
  });

  it("un pedido ya cobrado no se cancela solo aunque sus partes se caigan", () => {
    expect(nextOrderStatus({ current: "PAID", parts: [part("CANCELLED")] })).toBeNull();
  });
});

describe("needsBuyerDecision", () => {
  it("hay que preguntarle cuando el pedido encogió", () => {
    const parts = [part("CONFIRMED", 300), part("DECLINED", 200)];
    expect(needsBuyerDecision({ parts, acknowledgedTotalUsd: 500 })).toBe(true);
  });

  it("no hay nada que preguntar si ya aceptó el total nuevo", () => {
    const parts = [part("CONFIRMED", 300), part("DECLINED", 200)];
    expect(needsBuyerDecision({ parts, acknowledgedTotalUsd: 300 })).toBe(false);
  });

  it("un pedido entero caído no es una decisión: no queda nada que elegir", () => {
    expect(
      needsBuyerDecision({ parts: [part("DECLINED", 500)], acknowledgedTotalUsd: 500 }),
    ).toBe(false);
  });
});

describe("partOutcome", () => {
  const base = { confirmedAt: null, declineReason: null };

  it("un rechazo lleva el motivo del proveedor dentro de la frase", () => {
    expect(partOutcome({ ...base, status: "DECLINED", declineReason: "sin stock" })).toBe(
      "No pudo atenderlo: sin stock",
    );
  });

  it("un rechazo sin motivo no deja la frase colgando en dos puntos", () => {
    expect(partOutcome({ ...base, status: "DECLINED" })).toBe("No pudo atenderlo");
  });

  it("el que nunca contestó y el que aceptó y venció no se cuentan igual", () => {
    const callado = partOutcome({ ...base, status: "EXPIRED" });
    const aceptado = partOutcome({ ...base, status: "EXPIRED", confirmedAt: new Date() });
    expect(callado).toBe("No respondió a tiempo");
    expect(aceptado).not.toBe(callado);
  });
});
