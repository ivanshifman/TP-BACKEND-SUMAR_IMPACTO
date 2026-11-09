import { describe, expect, test } from "@jest/globals";
import { decidirCircuitoRendicion } from "../src/utils/reglasRendicion.js";

describe("decidirCircuitoRendicion", () => {
  test("aprueba automáticamente hasta el 5 % si cumple reglas y tope mensual", () => {
    expect(decidirCircuitoRendicion({ monto: 400, presupuesto: 10000, reglasBasicasCumplidas: true, acumuladoAutomaticoMes: 100 })).toEqual({
      porcentaje: 4, estado: "aprobado", requiereMesa: false, aprobadoAutomaticamente: true, observacion: null,
    });
  });

  test("deriva a Auditoría si el acumulado automático mensual supera el 5 %", () => {
    const result = decidirCircuitoRendicion({ monto: 300, presupuesto: 10000, reglasBasicasCumplidas: true, acumuladoAutomaticoMes: 300 });
    expect(result.estado).toBe("en_revision");
    expect(result.aprobadoAutomaticamente).toBe(false);
    expect(result.observacion).toMatch(/acumulado mensual/);
  });

  test("envía a Auditoría los comprobantes mayores al 5 % y hasta el 30 %", () => {
    const result = decidirCircuitoRendicion({ monto: 2000, presupuesto: 10000, reglasBasicasCumplidas: true });
    expect(result.estado).toBe("en_revision");
    expect(result.requiereMesa).toBe(false);
  });

  test("requiere decisión de Mesa Coordinadora por encima del 30 %", () => {
    const result = decidirCircuitoRendicion({ monto: 3500, presupuesto: 10000, reglasBasicasCumplidas: true });
    expect(result.estado).toBe("en_revision");
    expect(result.requiereMesa).toBe(true);
  });

  test("no autoaprueba un comprobante que incumple reglas básicas aunque sea menor al 5 %", () => {
    const result = decidirCircuitoRendicion({ monto: 200, presupuesto: 10000, reglasBasicasCumplidas: false });
    expect(result.estado).toBe("en_revision");
    expect(result.aprobadoAutomaticamente).toBe(false);
  });

  test.each([
    ["monto cero", { monto: 0, presupuesto: 10000 }],
    ["presupuesto cero", { monto: 1, presupuesto: 0 }],
    ["monto no numérico", { monto: "inválido", presupuesto: 10000 }],
    ["presupuesto no finito", { monto: 1, presupuesto: Infinity }],
  ])("rechaza %s", (_description, input) => {
    expect(() => decidirCircuitoRendicion({ ...input, reglasBasicasCumplidas: true })).toThrow(TypeError);
  });

  test("permite configurar los umbrales sin modificar la regla de negocio", () => {
    const result = decidirCircuitoRendicion({ monto: 800, presupuesto: 10000, reglasBasicasCumplidas: true, umbralAutoPct: 10, umbralMesaPct: 40, topeMensualAutoPct: 10 });
    expect(result.porcentaje).toBe(8);
    expect(result.aprobadoAutomaticamente).toBe(true);
  });

  test("deriva exactamente al umbral de Auditoría sin requerir intervención de Mesa", () => {
    const result = decidirCircuitoRendicion({ monto: 3000, presupuesto: 10000, reglasBasicasCumplidas: true });
    expect(result.requiereMesa).toBe(false);
    expect(result.estado).toBe("en_revision");
  });

  test("requiere Mesa al superar estrictamente el umbral configurado", () => {
    const result = decidirCircuitoRendicion({ monto: 3001, presupuesto: 10000, reglasBasicasCumplidas: true });
    expect(result.requiereMesa).toBe(true);
  });
});
