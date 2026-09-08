import { describe, expect, it } from "vitest";
import {
  effectivePrice,
  needsPromotion,
  nextPriceChange,
  type PriceEntry,
} from "./effective";

const at = (iso: string) => new Date(iso);
const entry = (iso: string, priceUsd: number): PriceEntry => ({
  priceUsd,
  startsAt: at(iso),
});

const HOY = at("2026-08-06T12:00:00Z");

describe("effectivePrice", () => {
  it("toma la fila más reciente que ya empezó", () => {
    const linea = [
      entry("2026-01-01T00:00:00Z", 200),
      entry("2026-06-01T00:00:00Z", 185),
      entry("2026-03-01T00:00:00Z", 190),
    ];
    expect(effectivePrice(linea, HOY)).toBe(185);
  });

  it("ignora lo programado para el futuro", () => {
    const linea = [
      entry("2026-01-01T00:00:00Z", 200),
      entry("2026-09-01T00:00:00Z", 150), // todavía no rige
    ];
    expect(effectivePrice(linea, HOY)).toBe(200);
  });

  it("no depende del orden en que lleguen las filas", () => {
    const desordenada = [
      entry("2026-09-01T00:00:00Z", 150),
      entry("2026-06-01T00:00:00Z", 185),
      entry("2026-01-01T00:00:00Z", 200),
    ];
    expect(effectivePrice(desordenada, HOY)).toBe(185);
  });

  it("una fila que empieza justo ahora ya rige", () => {
    // El borde: `startsAt <= now`, no `<`.
    expect(effectivePrice([entry("2026-08-06T12:00:00Z", 99)], HOY)).toBe(99);
  });

  it("una fila que empieza un milisegundo después todavía no", () => {
    expect(effectivePrice([entry("2026-08-06T12:00:00.001Z", 99)], HOY)).toBe(
      null,
    );
  });

  it("sin línea de tiempo no hay precio", () => {
    expect(effectivePrice([], HOY)).toBe(null);
  });

  it("si todo es futuro, devuelve null en vez de inventarse un cero", () => {
    // Devolver 0 sería regalar el producto. Quien llama decide qué hacer.
    expect(effectivePrice([entry("2026-12-01T00:00:00Z", 150)], HOY)).toBe(null);
  });

  it("el histórico se consulta preguntando por una fecha pasada", () => {
    const linea = [
      entry("2026-01-01T00:00:00Z", 200),
      entry("2026-06-01T00:00:00Z", 185),
    ];
    expect(effectivePrice(linea, at("2026-03-15T00:00:00Z"))).toBe(200);
  });

  it("antes de que empiece la línea de tiempo no había precio", () => {
    const linea = [entry("2026-01-01T00:00:00Z", 200)];
    expect(effectivePrice(linea, at("2025-12-31T00:00:00Z"))).toBe(null);
  });

  it("con dos filas en el mismo instante gana la última cargada", () => {
    const empate = [
      entry("2026-06-01T00:00:00Z", 185),
      entry("2026-06-01T00:00:00Z", 170),
    ];
    expect(effectivePrice(empate, HOY)).toBe(170);
  });
});

describe("nextPriceChange", () => {
  it("da el más cercano de los futuros", () => {
    const linea = [
      entry("2026-01-01T00:00:00Z", 200),
      entry("2026-12-01T00:00:00Z", 140),
      entry("2026-09-01T00:00:00Z", 150),
    ];
    expect(nextPriceChange(linea, HOY)?.priceUsd).toBe(150);
  });

  it("sin nada programado no hay próximo cambio", () => {
    expect(nextPriceChange([entry("2026-01-01T00:00:00Z", 200)], HOY)).toBe(null);
  });

  it("lo que empieza justo ahora ya no es futuro", () => {
    expect(nextPriceChange([entry("2026-08-06T12:00:00Z", 99)], HOY)).toBe(null);
  });

  it("con la línea vacía tampoco", () => {
    expect(nextPriceChange([], HOY)).toBe(null);
  });
});

describe("needsPromotion", () => {
  it("marca el item cuya caché se quedó vieja", () => {
    const linea = [
      entry("2026-01-01T00:00:00Z", 200),
      entry("2026-06-01T00:00:00Z", 185),
    ];
    expect(needsPromotion(linea, 200, HOY)).toBe(true);
  });

  it("no toca el que ya está al día", () => {
    const linea = [entry("2026-06-01T00:00:00Z", 185)];
    expect(needsPromotion(linea, 185, HOY)).toBe(false);
  });

  it("no promueve nada cuando no hay precio efectivo", () => {
    // Sin fila vigente, la caché es lo único que hay: pisarla con null sería
    // dejar el item sin precio.
    expect(needsPromotion([entry("2026-12-01T00:00:00Z", 150)], 200, HOY)).toBe(
      false,
    );
  });

  it("no promueve con la línea vacía", () => {
    expect(needsPromotion([], 200, HOY)).toBe(false);
  });
});
