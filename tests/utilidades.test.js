import { describe, expect, test } from "@jest/globals";
import { normalizarEmail } from "../src/utils/email.js";
import { diaUTC, esFechaFutura } from "../src/utils/fechas.js";
import { conBloqueo, bloqueosActivos } from "../src/utils/mutex.js";
import { esEstructuraPeligrosa } from "../src/middleware/sanitizeInput.js";
import { validarCambioDePresupuesto } from "../src/utils/reglasProyecto.js";
import { periodoDelReporte } from "../src/services/CampaniaService.js";

describe("normalizarEmail", () => {
  test("pasa a minúsculas y recorta espacios", () => {
    expect(normalizarEmail("  Ana.Perez@Ejemplo.ORG ")).toBe("ana.perez@ejemplo.org");
  });

  test("conserva los puntos de las cuentas Gmail (no altera la dirección real)", () => {
    expect(normalizarEmail("Ana.Perez@Gmail.com")).toBe("ana.perez@gmail.com");
  });

  test("tolera valores vacíos", () => {
    expect(normalizarEmail(undefined)).toBe("");
    expect(normalizarEmail(null)).toBe("");
  });
});

describe("fechas", () => {
  const ahora = Date.parse("2026-11-09T15:00:00.000Z");

  test("una fecha pasada o de hoy no es futura", () => {
    expect(esFechaFutura("2026-06-15", ahora)).toBe(false);
    expect(esFechaFutura("2026-11-09", ahora)).toBe(false);
  });

  test("tolera hasta un día de diferencia por zona horaria", () => {
    expect(esFechaFutura("2026-11-10T10:00:00.000Z", ahora)).toBe(false);
  });

  test("rechaza fechas claramente futuras", () => {
    expect(esFechaFutura("2026-11-12", ahora)).toBe(true);
    expect(esFechaFutura("2027-01-01", ahora)).toBe(true);
  });

  test("una fecha inválida no se considera futura (la valida otra regla)", () => {
    expect(esFechaFutura("no-es-fecha", ahora)).toBe(false);
  });

  test("diaUTC devuelve el inicio del día", () => {
    expect(diaUTC("2026-11-09T23:59:59.999Z")).toBe(Date.UTC(2026, 10, 9));
  });
});

describe("conBloqueo (exclusión mutua por clave)", () => {
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  test("serializa las tareas de una misma clave", async () => {
    const orden = [];
    const tarea = (nombre, demora) => conBloqueo("proyecto-1", async () => { orden.push(`inicio ${nombre}`); await esperar(demora); orden.push(`fin ${nombre}`); });
    await Promise.all([tarea("A", 30), tarea("B", 5), tarea("C", 1)]);
    expect(orden).toEqual(["inicio A", "fin A", "inicio B", "fin B", "inicio C", "fin C"]);
  });

  test("no bloquea tareas de claves distintas", async () => {
    const orden = [];
    const lenta = conBloqueo("a", async () => { await esperar(30); orden.push("lenta"); });
    const rapida = conBloqueo("b", async () => { orden.push("rapida"); });
    await Promise.all([lenta, rapida]);
    expect(orden).toEqual(["rapida", "lenta"]);
  });

  test("evita que dos lecturas simultáneas superen un saldo", async () => {
    let saldo = 100;
    const gastar = (monto) => conBloqueo("saldo", async () => { const leido = saldo; await esperar(5); if (monto > leido) return "rechazado"; saldo = leido - monto; return "ok"; });
    const resultados = await Promise.all([gastar(60), gastar(60)]);
    expect(resultados.sort()).toEqual(["ok", "rechazado"]);
    expect(saldo).toBe(40);
  });

  test("propaga el error de la tarea y libera el bloqueo para la siguiente", async () => {
    await expect(conBloqueo("falla", async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(conBloqueo("falla", async () => "recuperado")).resolves.toBe("recuperado");
  });

  test("no deja claves pendientes al terminar", async () => {
    await conBloqueo("limpieza", async () => 1);
    expect(bloqueosActivos()).toBe(0);
  });
});

describe("esEstructuraPeligrosa", () => {
  test("detecta operadores de MongoDB en cualquier nivel", () => {
    expect(esEstructuraPeligrosa({ email: { $ne: "" } })).toBe(true);
    expect(esEstructuraPeligrosa({ filtro: [{ ok: 1 }, { $where: "1" }] })).toBe(true);
  });

  test("detecta claves con puntos (rutas anidadas)", () => {
    expect(esEstructuraPeligrosa({ "a.b": 1 })).toBe(true);
  });

  test("rechaza estructuras demasiado profundas", () => {
    expect(esEstructuraPeligrosa({ a: { b: { c: { d: { e: { f: { g: { h: 1 } } } } } } } })).toBe(true);
  });

  test("acepta datos normales, arreglos y valores simples", () => {
    expect(esEstructuraPeligrosa({ nombre: "Ana", rubros: [{ nombre: "Alimentos", montoAprobado: 100 }] })).toBe(false);
    expect(esEstructuraPeligrosa(undefined)).toBe(false);
    expect(esEstructuraPeligrosa("texto")).toBe(false);
  });
});

describe("validarCambioDePresupuesto", () => {
  const rubrosActuales = [{ nombre: "Alimentos", montoAprobado: 6000 }, { nombre: "Transporte", montoAprobado: 4000 }];
  const base = { rubrosActuales, rubrosNuevos: rubrosActuales, presupuestoActual: 10000, presupuestoNuevo: 10000, totalComprometido: 5000, comprometidoPorRubro: new Map([["alimentos", 5000]]) };

  test("un cambio que no toca el presupuesto nunca se bloquea", () => {
    expect(validarCambioDePresupuesto(base)).toEqual([]);
  });

  test("permite aumentar el presupuesto y los rubros", () => {
    expect(validarCambioDePresupuesto({ ...base, presupuestoNuevo: 20000, rubrosNuevos: [{ nombre: "Alimentos", montoAprobado: 12000 }, { nombre: "Transporte", montoAprobado: 4000 }] })).toEqual([]);
  });

  test("rechaza bajar el presupuesto por debajo de lo comprometido", () => {
    const errores = validarCambioDePresupuesto({ ...base, presupuestoNuevo: 4000 });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/menor a lo ya comprometido/);
  });

  test("permite bajar el presupuesto mientras cubra lo comprometido", () => {
    expect(validarCambioDePresupuesto({ ...base, presupuestoNuevo: 8000 })).toEqual([]);
  });

  test("rechaza quitar un rubro que ya tiene rendiciones", () => {
    const errores = validarCambioDePresupuesto({ ...base, rubrosNuevos: [{ nombre: "Transporte", montoAprobado: 4000 }] });
    expect(errores[0]).toMatch(/No se puede quitar el rubro «Alimentos»/);
  });

  test("rechaza reducir un rubro por debajo de lo ya rendido", () => {
    const errores = validarCambioDePresupuesto({ ...base, rubrosNuevos: [{ nombre: "Alimentos", montoAprobado: 3000 }, { nombre: "Transporte", montoAprobado: 4000 }] });
    expect(errores[0]).toMatch(/no puede quedar por debajo de lo ya rendido/);
  });

  test("permite quitar o reducir rubros sin rendiciones", () => {
    expect(validarCambioDePresupuesto({ ...base, rubrosNuevos: [{ nombre: "Alimentos", montoAprobado: 6000 }] })).toEqual([]);
  });

  test("compara los nombres de rubro sin distinguir mayúsculas ni espacios", () => {
    expect(validarCambioDePresupuesto({ ...base, rubrosNuevos: [{ nombre: " ALIMENTOS ", montoAprobado: 6000 }, { nombre: "Transporte", montoAprobado: 4000 }] })).toEqual([]);
  });
});

describe("periodoDelReporte", () => {
  const ahora = new Date("2026-11-09T15:00:00.000Z");

  test("incluye todo el último día de la campaña", () => {
    const campania = { fechaInicio: new Date("2026-10-01T00:00:00.000Z"), fechaFin: new Date("2026-10-31T00:00:00.000Z") };
    const { hasta } = periodoDelReporte(campania, ahora);
    expect(hasta.toISOString()).toBe("2026-10-31T23:59:59.999Z");
    // Una donación hecha el 31 de octubre por la tarde queda dentro del período.
    expect(new Date("2026-10-31T18:00:00.000Z") <= hasta).toBe(true);
  });

  test("una campaña en curso se informa hasta ahora", () => {
    const campania = { fechaInicio: new Date("2026-11-01T00:00:00.000Z"), fechaFin: new Date("2026-12-31T00:00:00.000Z") };
    expect(periodoDelReporte(campania, ahora).hasta).toEqual(ahora);
  });

  test("nunca informa más de un año hacia atrás", () => {
    const campania = { fechaInicio: new Date("2020-01-01T00:00:00.000Z"), fechaFin: new Date("2027-01-01T00:00:00.000Z") };
    expect(periodoDelReporte(campania, ahora).desde.toISOString()).toBe("2025-11-09T15:00:00.000Z");
  });
});
