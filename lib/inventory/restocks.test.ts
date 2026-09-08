import { describe, expect, it } from "vitest";
import {
  hasExpired,
  isoDay,
  isRestockVisible,
  kitRestockWindow,
  phraseRestock,
  soonestRestock,
  type RestockWindow,
} from "./restocks";

const HOY = "2026-08-06";

const anuncio = (
  etaFrom: string,
  etaTo: string,
  status: RestockWindow["status"] = "ANNOUNCED",
): RestockWindow => ({ status, etaFrom, etaTo });

describe("isoDay", () => {
  it("recorta a día", () => {
    expect(isoDay(new Date("2026-08-06T23:45:00Z"))).toBe("2026-08-06");
  });
});

describe("isRestockVisible", () => {
  it("se enseña lo anunciado con la ventana por delante", () => {
    expect(isRestockVisible(anuncio("2026-08-10", "2026-08-15"), HOY)).toBe(true);
  });

  it("el último día de la ventana todavía cuenta", () => {
    // "Entre el 1 y el 6" sigue valiendo el día 6: la promesa es de días.
    expect(isRestockVisible(anuncio("2026-08-01", "2026-08-06"), HOY)).toBe(true);
  });

  it("un anuncio olvidado desaparece solo al pasar su ventana", () => {
    // Nadie va a entrar a limpiarlo, y "vuelve la semana que viene" escrito hace
    // un mes hace más daño que no decir nada.
    expect(isRestockVisible(anuncio("2026-07-01", "2026-08-05"), HOY)).toBe(false);
  });

  it("una ventana que empieza en el futuro se enseña igual", () => {
    // Es justo lo que se quiere anunciar: lo que va a llegar.
    expect(isRestockVisible(anuncio("2026-09-01", "2026-09-10"), HOY)).toBe(true);
  });

  it("lo ya llegado no se sigue anunciando", () => {
    expect(
      isRestockVisible(anuncio("2026-08-10", "2026-08-15", "ARRIVED"), HOY),
    ).toBe(false);
  });

  it("ni lo cancelado ni lo caducado", () => {
    expect(
      isRestockVisible(anuncio("2026-08-10", "2026-08-15", "CANCELLED"), HOY),
    ).toBe(false);
    expect(
      isRestockVisible(anuncio("2026-08-10", "2026-08-15", "EXPIRED"), HOY),
    ).toBe(false);
  });
});

describe("soonestRestock", () => {
  it("de dos anuncios vale el que llega antes", () => {
    const restocks = [
      anuncio("2026-09-01", "2026-09-10"),
      anuncio("2026-08-12", "2026-08-14"),
    ];
    expect(soonestRestock(restocks, HOY)?.etaFrom).toBe("2026-08-12");
  });

  it("descarta los que ya no valen aunque lleguen antes", () => {
    const restocks = [
      anuncio("2026-07-01", "2026-07-20"), // ventana pasada
      anuncio("2026-09-01", "2026-09-10"),
    ];
    expect(soonestRestock(restocks, HOY)?.etaFrom).toBe("2026-09-01");
  });

  it("sin nada válido no promete nada", () => {
    expect(soonestRestock([anuncio("2026-07-01", "2026-07-20")], HOY)).toBe(null);
  });

  it("con la lista vacía tampoco", () => {
    expect(soonestRestock([], HOY)).toBe(null);
  });
});

describe("kitRestockWindow", () => {
  const falta = (...restocks: RestockWindow[]) => ({ restocks });

  it("llega cuando llegue la última pieza que falta", () => {
    // De nada sirve que los paneles entren el 12 si la batería no viene hasta
    // el 20.
    const ventana = kitRestockWindow(
      [
        falta(anuncio("2026-08-10", "2026-08-12")),
        falta(anuncio("2026-08-18", "2026-08-20")),
      ],
      HOY,
    );
    expect(ventana).toEqual({ etaFrom: "2026-08-18", etaTo: "2026-08-20" });
  });

  it("con una sola pieza faltante, su propia ventana", () => {
    expect(kitRestockWindow([falta(anuncio("2026-08-10", "2026-08-12"))], HOY)).toEqual(
      { etaFrom: "2026-08-10", etaTo: "2026-08-12" },
    );
  });

  it("si a una pieza que falta no le espera nada, el kit no promete", () => {
    // La diferencia entre "vuelve pronto" y "no sabemos". Confundirlas es lo que
    // erosiona la confianza.
    expect(
      kitRestockWindow(
        [falta(anuncio("2026-08-10", "2026-08-12")), falta()],
        HOY,
      ),
    ).toBe(null);
  });

  it("una pieza cuyo único anuncio ya caducó cuenta como sin esperanza", () => {
    expect(
      kitRestockWindow(
        [
          falta(anuncio("2026-08-10", "2026-08-12")),
          falta(anuncio("2026-07-01", "2026-07-20")),
        ],
        HOY,
      ),
    ).toBe(null);
  });

  it("un kit al que no le falta nada no tiene ventana que anunciar", () => {
    // No es "vuelve pronto": es que ya está disponible.
    expect(kitRestockWindow([], HOY)).toBe(null);
  });

  it("de cada pieza toma su reposición más temprana", () => {
    const ventana = kitRestockWindow(
      [
        falta(anuncio("2026-09-20", "2026-09-25"), anuncio("2026-08-10", "2026-08-12")),
        falta(anuncio("2026-08-14", "2026-08-16")),
      ],
      HOY,
    );
    // Cada pieza aporta la suya más cercana (12 y 14) y manda la más tardía.
    expect(ventana).toEqual({ etaFrom: "2026-08-14", etaTo: "2026-08-16" });
  });
});

describe("phraseRestock", () => {
  it("un solo día se dice con el día: el proveedor está seguro", () => {
    expect(phraseRestock({ etaFrom: "2026-08-20", etaTo: "2026-08-20" }, HOY)).toEqual({
      kind: "day",
      day: "2026-08-20",
    });
  });

  it("una ventana se dice con sus dos extremos, porque eso es la duda", () => {
    expect(phraseRestock({ etaFrom: "2026-08-10", etaTo: "2026-08-15" }, HOY)).toEqual({
      kind: "range",
      from: "2026-08-10",
      to: "2026-08-15",
    });
  });

  it("a más de mes y medio se dice el mes, no el día", () => {
    // Dar una fecha exacta a tres meses vista finge una precisión que no hay.
    expect(phraseRestock({ etaFrom: "2026-11-10", etaTo: "2026-11-20" }, HOY)).toEqual({
      kind: "month",
      day: "2026-11-10",
    });
  });

  it("justo en el límite todavía se dice la ventana", () => {
    const limite = "2026-09-20"; // 45 días exactos
    expect(phraseRestock({ etaFrom: limite, etaTo: "2026-09-25" }, HOY).kind).toBe(
      "range",
    );
  });

  it("un día después del límite ya se vuelve vago", () => {
    expect(phraseRestock({ etaFrom: "2026-09-21", etaTo: "2026-09-25" }, HOY).kind).toBe(
      "month",
    );
  });

  it("una ventana que ya empezó se dice igual con sus extremos", () => {
    // "Entre el 1 y el 15" el día 6: sigue siendo la mejor descripción.
    expect(phraseRestock({ etaFrom: "2026-08-01", etaTo: "2026-08-15" }, HOY)).toEqual({
      kind: "range",
      from: "2026-08-01",
      to: "2026-08-15",
    });
  });
});

describe("hasExpired", () => {
  it("caduca lo anunciado cuya ventana quedó atrás", () => {
    expect(hasExpired(anuncio("2026-07-01", "2026-08-05"), HOY)).toBe(true);
  });

  it("el propio día del cierre todavía no", () => {
    expect(hasExpired(anuncio("2026-07-01", "2026-08-06"), HOY)).toBe(false);
  });

  it("no vuelve a tocar lo que ya está resuelto", () => {
    expect(hasExpired(anuncio("2026-07-01", "2026-07-05", "ARRIVED"), HOY)).toBe(
      false,
    );
    expect(hasExpired(anuncio("2026-07-01", "2026-07-05", "EXPIRED"), HOY)).toBe(
      false,
    );
  });

  it("ocultar no es cerrar: lo que el catálogo esconde, el cron lo marca", () => {
    // Las dos preguntas se hacen sobre la misma fila y dan lo contrario: el
    // comprador deja de verlo, y el proveedor lo ve en su lista para resolverlo.
    const viejo = anuncio("2026-07-01", "2026-08-05");
    expect(isRestockVisible(viejo, HOY)).toBe(false);
    expect(hasExpired(viejo, HOY)).toBe(true);
  });
});
