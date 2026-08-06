import { describe, expect, it } from "vitest";
import {
  confirmationDueAt,
  coversPaymentWindow,
  DEFAULT_HOLD_HOURS,
  holdHoursFor,
  MAX_CONFIRMATION_HOURS,
  orderExpiresAt,
  reservationExpiresAt,
} from "./holds";

const AHORA = new Date("2026-08-06T12:00:00Z");
const at = (iso: string) => new Date(iso);
const horasDesdeAhora = (fecha: Date) =>
  (fecha.getTime() - AHORA.getTime()) / (60 * 60 * 1000);

describe("holdHoursFor", () => {
  it("respeta lo que configuró el proveedor", () => {
    expect(holdHoursFor(12)).toBe(12);
    expect(holdHoursFor(168)).toBe(168);
  });

  it("sin configurar, el default de la plataforma", () => {
    expect(holdHoursFor(null)).toBe(DEFAULT_HOLD_HOURS);
    expect(holdHoursFor(undefined)).toBe(DEFAULT_HOLD_HOURS);
  });

  it("cero no significa 'no retengas nada'", () => {
    // Dejaría el pedido muerto en el mismo instante de crearse.
    expect(holdHoursFor(0)).toBe(DEFAULT_HOLD_HOURS);
  });

  it("un negativo tampoco", () => {
    expect(holdHoursFor(-5)).toBe(DEFAULT_HOLD_HOURS);
  });
});

describe("reservationExpiresAt", () => {
  it("suma las horas del proveedor a partir de ahora", () => {
    expect(horasDesdeAhora(reservationExpiresAt(AHORA, 12))).toBe(12);
  });

  it("sin configurar, las 72 h por defecto", () => {
    expect(horasDesdeAhora(reservationExpiresAt(AHORA, null))).toBe(
      DEFAULT_HOLD_HOURS,
    );
  });

  it("devuelve un instante absoluto, no una duración", () => {
    // Es lo que permite que cambiar el ajuste mañana no mueva esta reserva.
    expect(reservationExpiresAt(AHORA, 24).toISOString()).toBe(
      "2026-08-07T12:00:00.000Z",
    );
  });

  it("no muta la fecha que recibe", () => {
    const copia = new Date(AHORA);
    reservationExpiresAt(copia, 48);
    expect(copia.getTime()).toBe(AHORA.getTime());
  });
});

describe("confirmationDueAt", () => {
  it("da al proveedor un día como mucho", () => {
    expect(horasDesdeAhora(confirmationDueAt(AHORA, 72))).toBe(
      MAX_CONFIRMATION_HOURS,
    );
  });

  it("nunca más de lo que él mismo retiene", () => {
    // No tiene sentido guardar mercancía para quien aún no ha dicho que sí.
    expect(horasDesdeAhora(confirmationDueAt(AHORA, 6))).toBe(6);
  });

  it("con hold mal configurado usa el default y sigue topando en 24 h", () => {
    expect(horasDesdeAhora(confirmationDueAt(AHORA, 0))).toBe(
      MAX_CONFIRMATION_HOURS,
    );
  });

  it("siempre vence antes que la reserva, o al mismo tiempo", () => {
    for (const hold of [1, 6, 24, 72, 168, null]) {
      const confirma = confirmationDueAt(AHORA, hold).getTime();
      const reserva = reservationExpiresAt(AHORA, hold).getTime();
      expect(confirma).toBeLessThanOrEqual(reserva);
    }
  });
});

describe("orderExpiresAt", () => {
  it("manda el proveedor más impaciente", () => {
    const vivas = [
      at("2026-08-09T12:00:00Z"),
      at("2026-08-07T00:00:00Z"), // el más temprano
      at("2026-08-13T12:00:00Z"),
    ];
    expect(orderExpiresAt(vivas)?.toISOString()).toBe("2026-08-07T00:00:00.000Z");
  });

  it("con una sola reserva, esa es la fecha", () => {
    expect(orderExpiresAt([at("2026-08-09T12:00:00Z")])?.toISOString()).toBe(
      "2026-08-09T12:00:00.000Z",
    );
  });

  it("sin reservas vivas no hay fecha", () => {
    // El carrito solo de servicios: no reserva nada. Es el caso que se olvida.
    expect(orderExpiresAt([])).toBe(null);
  });

  it("cuando cae el impaciente, la fecha se aleja", () => {
    // La propiedad que sale gratis de la derivada: el comprador gana tiempo
    // para decidir justo cuando algo se le cae, sin que nadie se lo conceda.
    const antes = [at("2026-08-07T00:00:00Z"), at("2026-08-13T12:00:00Z")];
    const despues = [at("2026-08-13T12:00:00Z")];

    expect(orderExpiresAt(despues)!.getTime()).toBeGreaterThan(
      orderExpiresAt(antes)!.getTime(),
    );
  });

  it("nunca se acorta al quitar reservas", () => {
    const todas = [
      at("2026-08-07T00:00:00Z"),
      at("2026-08-09T12:00:00Z"),
      at("2026-08-13T12:00:00Z"),
    ];
    const inicial = orderExpiresAt(todas)!.getTime();

    // Quitando una cualquiera, el mínimo solo puede quedarse igual o irse lejos.
    for (let i = 0; i < todas.length; i++) {
      const restantes = todas.filter((_, index) => index !== i);
      expect(orderExpiresAt(restantes)!.getTime()).toBeGreaterThanOrEqual(inicial);
    }
  });

  it("con vencimientos iguales devuelve ese instante", () => {
    const iguales = [at("2026-08-09T12:00:00Z"), at("2026-08-09T12:00:00Z")];
    expect(orderExpiresAt(iguales)?.toISOString()).toBe("2026-08-09T12:00:00.000Z");
  });
});

describe("coversPaymentWindow", () => {
  it("72 h cubren de sobra un Zelle de 48", () => {
    expect(coversPaymentWindow(72, 48)).toBe(true);
  });

  it("12 h no llegan a completar un Zelle manual", () => {
    expect(coversPaymentWindow(12, 48)).toBe(false);
  });

  it("justo lo que dura la ventana cuenta como suficiente", () => {
    expect(coversPaymentWindow(48, 48)).toBe(true);
  });

  it("el que no configuró nada cubre la ventana por defecto", () => {
    expect(coversPaymentWindow(null, DEFAULT_HOLD_HOURS)).toBe(true);
  });

  it("con pago inmediato hasta un hold corto vale", () => {
    // Lo que baja el suelo al llegar QvaPay: no cambia la regla, cambia el
    // número que se le pasa.
    expect(coversPaymentWindow(2, 1)).toBe(true);
  });
});
