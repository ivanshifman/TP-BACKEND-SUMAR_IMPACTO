import { describe, expect, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import { auditar, debeAuditarse, resultadoSegunEstado } from "../src/middleware/auditoria.js";

const crearRespuesta = (statusCode) => Object.assign(new EventEmitter(), { statusCode, locals: {} });
const crearSolicitud = (extra = {}) => ({ method: "POST", originalUrl: "/api/donaciones", ip: "10.0.0.5", get: () => "agente-de-prueba", ...extra });
const esperar = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("debeAuditarse", () => {
  test("audita toda escritura", () => {
    for (const metodo of ["POST", "PUT", "PATCH", "DELETE"]) expect(debeAuditarse(metodo, "/api/proyectos")).toBe(true);
  });

  test("audita el acceso a comprobantes y reportes", () => {
    expect(debeAuditarse("GET", "/rendiciones/64b0c0ffee0000000000abcd/comprobante")).toBe(true);
    expect(debeAuditarse("GET", "/admin/campanias/64b0c0ffee0000000000abcd/reporte")).toBe(true);
    expect(debeAuditarse("GET", "/admin/campanias/64b0c0ffee0000000000abcd/reporte.pdf")).toBe(true);
  });

  test("no audita las lecturas comunes", () => {
    expect(debeAuditarse("GET", "/api/proyectos")).toBe(false);
    expect(debeAuditarse("GET", "/")).toBe(false);
    expect(debeAuditarse("OPTIONS", "/api/proyectos")).toBe(false);
  });
});

describe("resultadoSegunEstado", () => {
  test("clasifica según el código HTTP", () => {
    expect(resultadoSegunEstado(200)).toBe("ok");
    expect(resultadoSegunEstado(302)).toBe("ok");
    expect(resultadoSegunEstado(403)).toBe("rechazado");
    expect(resultadoSegunEstado(429)).toBe("rechazado");
    expect(resultadoSegunEstado(500)).toBe("error");
  });
});

describe("middleware auditar", () => {
  test("registra al terminar la respuesta, con usuario, ruta sin query e id del recurso", async () => {
    const eventos = [];
    const res = crearRespuesta(201);
    const req = crearSolicitud({ originalUrl: "/api/proyectos/64b0c0ffee0000000000abcd?secreto=1", method: "PUT", user: { _id: "u1", email: "admin@x.test", rol: "administrador" } });
    let siguiente = false;
    auditar({ registrar: (evento) => eventos.push(evento) })(req, res, () => { siguiente = true; });
    expect(siguiente).toBe(true);
    expect(eventos).toHaveLength(0);
    res.emit("finish");
    await esperar();
    expect(eventos).toEqual([{
      usuario: "u1", email: "admin@x.test", rol: "administrador", metodo: "PUT",
      ruta: "/api/proyectos/64b0c0ffee0000000000abcd", recursoId: "64b0c0ffee0000000000abcd",
      estado: 201, resultado: "ok", ip: "10.0.0.5", userAgent: "agente-de-prueba",
    }]);
  });

  test("usa el usuario que deja el login en res.locals cuando todavía no hay req.user", async () => {
    const eventos = [];
    const res = crearRespuesta(302);
    res.locals.usuarioAuditoria = { _id: "u2", email: "ana@x.test", rol: "auditoria" };
    auditar({ registrar: (evento) => eventos.push(evento) })(crearSolicitud({ originalUrl: "/login" }), res, () => {});
    res.emit("finish");
    await esperar();
    expect(eventos[0]).toMatchObject({ usuario: "u2", email: "ana@x.test", ruta: "/login", resultado: "ok" });
  });

  test("un intento sin usuario se registra con usuario nulo", async () => {
    const eventos = [];
    const res = crearRespuesta(401);
    auditar({ registrar: (evento) => eventos.push(evento) })(crearSolicitud({ originalUrl: "/login" }), res, () => {});
    res.emit("finish");
    await esperar();
    expect(eventos[0]).toMatchObject({ usuario: null, email: null, rol: null, resultado: "rechazado" });
  });

  test("no registra lecturas comunes", async () => {
    const eventos = [];
    const res = crearRespuesta(200);
    auditar({ registrar: (evento) => eventos.push(evento) })(crearSolicitud({ method: "GET", originalUrl: "/api/proyectos" }), res, () => {});
    res.emit("finish");
    await esperar();
    expect(eventos).toHaveLength(0);
  });

  test("un fallo al registrar no interrumpe ni propaga errores", async () => {
    const res = crearRespuesta(200);
    const original = console.error;
    const mensajes = [];
    console.error = (...argumentos) => mensajes.push(argumentos.join(" "));
    try {
      auditar({ registrar: () => { throw new Error("base caída"); } })(crearSolicitud(), res, () => {});
      expect(() => res.emit("finish")).not.toThrow();
      await esperar();
    } finally {
      console.error = original;
    }
    expect(mensajes.join(" ")).toContain("base caída");
  });
});
