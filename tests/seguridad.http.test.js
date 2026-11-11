import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Pruebas HTTP de la cadena de seguridad. No usan base de datos: el acceso a `Usuario` y a la
// bitácora se reemplaza por stubs, de modo que verifican solo middleware, rutas y vistas.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "seguridad-access-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ";
process.env.JWT_REFRESH_SECRET = "seguridad-refresh-secret-9876543210-zyxwvutsrqponmlkjihgfedcba";
process.env.JWT_ISSUER = "sumarimpacto-seguridad-test";
process.env.JWT_AUDIENCE = "sumarimpacto-seguridad-client";

let server;
let base;
let Usuario;
let auditoriaService;
const original = {};
const eventos = [];

const nuevoId = () => new mongoose.Types.ObjectId();
const usuarios = {
  referente: { _id: nuevoId(), nombre: "Referente de prueba", email: "referente@prueba.test", rol: "referente_territorial", organizacion: nuevoId(), activo: true, debeCambiarPassword: false },
  auditoria: { _id: nuevoId(), nombre: "Auditora de prueba", email: "auditoria@prueba.test", rol: "auditoria", organizacion: null, activo: true, debeCambiarPassword: false },
  pendiente: { _id: nuevoId(), nombre: "Cuenta nueva", email: "nueva@prueba.test", rol: "referente_territorial", organizacion: nuevoId(), activo: true, debeCambiarPassword: true },
};

const tokenDe = (usuario) => jwt.sign({ rol: usuario.rol }, process.env.JWT_ACCESS_SECRET, {
  subject: String(usuario._id), expiresIn: "15m", issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, algorithm: "HS256",
});
const conToken = (usuario) => ({ Authorization: `Bearer ${tokenDe(usuario)}` });
const conCookie = (usuario) => ({ Cookie: `access_token=${tokenDe(usuario)}` });
const pedir = (ruta, opciones = {}) => fetch(base + ruta, { redirect: "manual", ...opciones });
const esperarBitacora = () => new Promise((resolve) => setTimeout(resolve, 30));

describe("seguridad HTTP (sin base de datos)", () => {
  beforeAll(async () => {
    ({ default: Usuario } = await import("../src/models/Usuario.js"));
    ({ default: auditoriaService } = await import("../src/services/AuditoriaService.js"));
    const { default: app } = await import("../src/app.js");

    original.findOne = Usuario.findOne;
    original.registrar = auditoriaService.registrar;
    original.listar = auditoriaService.listar;
    Usuario.findOne = (filtro) => ({
      select: async () => (filtro.email ? null : Object.values(usuarios).find((usuario) => String(usuario._id) === String(filtro._id)) ?? null),
    });
    auditoriaService.registrar = async (evento) => { eventos.push(evento); };
    auditoriaService.listar = async () => ({
      datos: [{ fecha: new Date("2026-11-09T12:00:00Z"), email: "alguien@prueba.test", rol: "administrador", metodo: "DELETE", ruta: "/api/donaciones/abc", estado: 204, resultado: "ok", ip: "10.0.0.1" }],
      total: 1, pagina: 1, limite: 50, paginas: 1,
    });

    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    Usuario.findOne = original.findOne;
    auditoriaService.registrar = original.registrar;
    auditoriaService.listar = original.listar;
    await new Promise((resolve) => server.close(resolve));
  });

  describe("encabezados", () => {
    test("las páginas dinámicas llevan CSP estricta, no-store y Referrer-Policy same-origin", async () => {
      const respuesta = await pedir("/login");
      expect(respuesta.status).toBe(200);
      const csp = respuesta.headers.get("content-security-policy");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("script-src-attr 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toContain("upgrade-insecure-requests");
      expect(respuesta.headers.get("cache-control")).toBe("no-store");
      expect(respuesta.headers.get("referrer-policy")).toBe("same-origin");
      expect(respuesta.headers.get("x-powered-by")).toBeNull();
    });

    test("los archivos estáticos sí pueden cachearse", async () => {
      const css = await pedir("/css/styles.css");
      expect(css.status).toBe(200);
      expect(css.headers.get("cache-control") ?? "").not.toContain("no-store");
      const js = await pedir("/js/app.js");
      expect(js.status).toBe(200);
      expect(js.headers.get("content-type")).toContain("javascript");
    });

    test("las respuestas de la API tampoco se almacenan en caché", async () => {
      const respuesta = await pedir("/api/proyectos");
      expect(respuesta.headers.get("cache-control")).toBe("no-store");
    });

    test("el HTML no contiene manejadores en línea (compatible con la CSP)", async () => {
      const html = await (await pedir("/login")).text();
      expect(html).not.toMatch(/\son(submit|click|change|load)=/i);
    });
  });

  describe("defensas de entrada", () => {
    test("rechaza operadores de MongoDB en el cuerpo", async () => {
      const respuesta = await pedir("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: { $ne: "" }, password: "x" }) });
      expect(respuesta.status).toBe(400);
      expect((await respuesta.json()).mensaje).toMatch(/no permitidas/);
    });

    test("rechaza operadores de MongoDB en la query string", async () => {
      const respuesta = await pedir("/api/gastos?estado[$ne]=aprobado", { headers: conToken(usuarios.auditoria) });
      expect(respuesta.status).toBe(400);
    });

    test("bloquea escrituras desde un origen no confiable", async () => {
      const respuesta = await pedir("/api/usuarios", { method: "POST", headers: { Origin: "https://sitio-malicioso.example", "Content-Type": "application/json" }, body: "{}" });
      expect(respuesta.status).toBe(403);
    });

    test("admite siempre las solicitudes del propio sitio", async () => {
      const respuesta = await pedir("/api/auth/login", { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email: "no-es-un-email", password: "x" }) });
      expect(respuesta.status).toBe(400);
    });
  });

  describe("autenticación y roles", () => {
    test("la API exige autenticación", async () => {
      const respuesta = await pedir("/api/proyectos");
      expect(respuesta.status).toBe(401);
      expect((await respuesta.json()).mensaje).toBe("Autenticación requerida.");
    });

    test("un referente no puede consultar donantes ni donaciones de un proyecto", async () => {
      expect((await pedir("/api/donantes", { headers: conToken(usuarios.referente) })).status).toBe(403);
      expect((await pedir(`/api/proyectos/${nuevoId()}/donaciones`, { headers: conToken(usuarios.referente) })).status).toBe(403);
    });

    test("la bitácora solo la consultan Auditoría y el administrador", async () => {
      expect((await pedir("/api/auditoria", { headers: conToken(usuarios.referente) })).status).toBe(403);
      const permitido = await pedir("/api/auditoria", { headers: conToken(usuarios.auditoria) });
      expect(permitido.status).toBe(200);
      expect((await permitido.json()).total).toBe(1);
      expect((await pedir("/admin/auditoria", { headers: conCookie(usuarios.referente) })).status).toBe(403);
    });

    test("la vista de bitácora se renderiza con sus registros", async () => {
      const respuesta = await pedir("/admin/auditoria", { headers: conCookie(usuarios.auditoria) });
      expect(respuesta.status).toBe(200);
      const html = await respuesta.text();
      expect(html).toContain("Bitácora de auditoría");
      expect(html).toContain("/api/donaciones/abc");
      expect(html).toContain("alguien@prueba.test");
    });

    test("el menú muestra solo lo que el rol puede usar", async () => {
      const html = await (await pedir("/tutorial", { headers: conCookie(usuarios.referente) })).text();
      expect(html).toContain('href="/gastos"');
      expect(html).toContain('href="/perfil/password"');
      expect(html).toContain("/js/app.js");
      expect(html).not.toContain('href="/donantes"');
      expect(html).not.toContain('href="/admin/auditoria"');
    });
  });

  describe("cambio de contraseña obligatorio", () => {
    test("la API bloquea todo salvo cambiar la contraseña, ver el perfil y salir", async () => {
      const bloqueada = await pedir("/api/proyectos", { headers: conToken(usuarios.pendiente) });
      expect(bloqueada.status).toBe(403);
      expect((await bloqueada.json()).codigo).toBe("PASSWORD_CHANGE_REQUIRED");
      expect((await pedir("/api/auth/me", { headers: conToken(usuarios.pendiente) })).status).toBe(200);
    });

    test("la web redirige al formulario de cambio de contraseña", async () => {
      const redireccion = await pedir("/", { headers: conCookie(usuarios.pendiente) });
      expect(redireccion.status).toBe(302);
      expect(redireccion.headers.get("location")).toBe("/perfil/password");
      expect((await pedir("/tutorial", { headers: conCookie(usuarios.pendiente) })).status).toBe(302);

      const formulario = await pedir("/perfil/password", { headers: conCookie(usuarios.pendiente) });
      expect(formulario.status).toBe(200);
      expect(await formulario.text()).toContain("contraseña propia");
    });

    test("una cuenta sin cambio pendiente no ve el aviso", async () => {
      const html = await (await pedir("/perfil/password", { headers: conCookie(usuarios.referente) })).text();
      expect(html).not.toContain("contraseña propia");
      expect(html).toContain("Cambiar contraseña");
    });
  });

  describe("bitácora de auditoría", () => {
    test("registra una escritura rechazada con el usuario, sin guardar el cuerpo", async () => {
      eventos.length = 0;
      const respuesta = await pedir("/api/proyectos", { method: "POST", headers: { ...conToken(usuarios.referente), "Content-Type": "application/json" }, body: JSON.stringify({ nombre: "x", secreto: "no-debe-registrarse" }) });
      expect(respuesta.status).toBe(403);
      await esperarBitacora();
      expect(eventos).toHaveLength(1);
      expect(eventos[0]).toMatchObject({ metodo: "POST", ruta: "/api/proyectos", estado: 403, resultado: "rechazado", email: "referente@prueba.test", rol: "referente_territorial" });
      expect(JSON.stringify(eventos)).not.toContain("no-debe-registrarse");
    });

    test("no registra las lecturas comunes", async () => {
      eventos.length = 0;
      await pedir("/api/auth/me", { headers: conToken(usuarios.referente) });
      await pedir("/health");
      await esperarBitacora();
      expect(eventos).toHaveLength(0);
    });

    test("registra los intentos de ingreso fallidos sin usuario ni contraseña", async () => {
      eventos.length = 0;
      const respuesta = await pedir("/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "email=nadie%40prueba.test&password=Clave-Incorrecta-1%21" });
      expect(respuesta.status).toBe(401);
      await esperarBitacora();
      expect(eventos).toHaveLength(1);
      expect(eventos[0]).toMatchObject({ metodo: "POST", ruta: "/login", resultado: "rechazado", usuario: null });
      expect(JSON.stringify(eventos)).not.toContain("Clave-Incorrecta");
    });

    test("registra también las solicitudes que bloquea la protección de origen", async () => {
      eventos.length = 0;
      await pedir("/api/usuarios", { method: "POST", headers: { Origin: "https://sitio-malicioso.example", "Content-Type": "application/json" }, body: "{}" });
      await esperarBitacora();
      expect(eventos).toHaveLength(1);
      expect(eventos[0]).toMatchObject({ estado: 403, resultado: "rechazado" });
    });
  });
});
