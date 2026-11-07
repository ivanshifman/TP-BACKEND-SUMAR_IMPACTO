import test from "node:test";
import assert from "node:assert/strict";
import { decidirCircuitoRendicion } from "../src/utils/reglasRendicion.js";

test("aprueba automáticamente hasta el 5 % si cumple reglas y tope mensual", () => {
  assert.deepEqual(decidirCircuitoRendicion({ monto: 400, presupuesto: 10000, reglasBasicasCumplidas: true, acumuladoAutomaticoMes: 100 }), {
    porcentaje: 4, estado: "aprobado", requiereMesa: false, aprobadoAutomaticamente: true, observacion: null,
  });
});

test("deriva a Auditoría si el acumulado automático mensual supera el 5 %", () => {
  const result = decidirCircuitoRendicion({ monto: 300, presupuesto: 10000, reglasBasicasCumplidas: true, acumuladoAutomaticoMes: 300 });
  assert.equal(result.estado, "en_revision");
  assert.equal(result.aprobadoAutomaticamente, false);
  assert.match(result.observacion, /acumulado mensual/);
});

test("envía a Auditoría los comprobantes mayores al 5 % y hasta el 30 %", () => {
  const result = decidirCircuitoRendicion({ monto: 2000, presupuesto: 10000, reglasBasicasCumplidas: true });
  assert.equal(result.estado, "en_revision");
  assert.equal(result.requiereMesa, false);
});

test("requiere decisión de Mesa Coordinadora por encima del 30 %", () => {
  const result = decidirCircuitoRendicion({ monto: 3500, presupuesto: 10000, reglasBasicasCumplidas: true });
  assert.equal(result.estado, "en_revision");
  assert.equal(result.requiereMesa, true);
});

test("no autoaprueba un comprobante que incumple reglas básicas aunque sea menor al 5 %", () => {
  const result = decidirCircuitoRendicion({ monto: 200, presupuesto: 10000, reglasBasicasCumplidas: false });
  assert.equal(result.estado, "en_revision");
  assert.equal(result.aprobadoAutomaticamente, false);
});

test("rechaza presupuesto o monto inválido", () => {
  assert.throws(() => decidirCircuitoRendicion({ monto: 0, presupuesto: 10000, reglasBasicasCumplidas: true }), TypeError);
});

test("permite configurar los umbrales sin modificar la regla de negocio", () => {
  const result = decidirCircuitoRendicion({ monto: 800, presupuesto: 10000, reglasBasicasCumplidas: true, umbralAutoPct: 10, umbralMesaPct: 40, topeMensualAutoPct: 10 });
  assert.equal(result.porcentaje, 8);
  assert.equal(result.aprobadoAutomaticamente, true);
});
