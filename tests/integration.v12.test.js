import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";

// Pruebas de integración de la versión 1.2: cuentas y contraseñas, ciclo de vida del proyecto,
// validaciones de negocio, bitácora de auditoría y concurrencia. Usan un MongoDB temporal aislado.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "integration12-access-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ";
process.env.JWT_REFRESH_SECRET = "integration12-refresh-secret-9876543210-zyxwvutsrqponmlkjihgfedcba";
process.env.JWT_ISSUER = "sumarimpacto-integration12-test";
process.env.JWT_AUDIENCE = "sumarimpacto-integration12-client";

let app;
let Usuario, Organizacion, Proyecto, Donante, Donacion, Campania, Gasto, Auditoria;
let mongo;
let users;
let organizationA;
let organizationB;
let projectA;
let donor;

const roles = { admin: "administrador", referente: "referente_territorial", auditoria: "auditoria", mesa: "mesa_coordinadora", administracion: "administracion" };
const password = "Integration123!";
const temporal = "Temporal-Clave-2026!";
const nuevaClave = "Nueva-Clave-2026!";
const esperarBitacora = () => new Promise((resolve) => setTimeout(resolve, 150));

const bearerFor = (role) => jwt.sign(
  { rol: users[role].rol, organizacion: users[role].organizacion ? String(users[role].organizacion) : null },
  process.env.JWT_ACCESS_SECRET,
  { subject: String(users[role]._id), expiresIn: "15m", issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, algorithm: "HS256" },
);
const auth = (role) => ({ Authorization: `Bearer ${bearerFor(role)}` });

const validPdf = () => Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const expenseForm = (project, amount = 400) => ({ proyecto: String(project._id), monto: String(amount), fecha: "2026-06-15", rubro: "Alimentos", descripcion: "Compra de alimentos" });

function uploadExpense(role, form) {
  let call = request(app).post("/api/gastos").set(auth(role));
  for (const [key, value] of Object.entries(form)) call = call.field(key, value);
  return call.attach("comprobante", validPdf(), { filename: "comprobante.pdf", contentType: "application/pdf" });
}

const seedGasto = (amount = 600) => Gasto.create({
  proyecto: projectA._id, monto: amount, fecha: new Date("2026-06-15T12:00:00.000Z"), descripcion: "Gasto de integración", rubro: "Alimentos",
  comprobante: { nombre: "test.pdf", mimeType: "application/pdf", tamanio: validPdf().length, contenido: validPdf() },
  estado: "en_revision", porcentajePresupuesto: amount / 100, reglasBasicasCumplidas: true, cargadoPor: users.referente._id, requiereMesa: false, aprobadoAutomaticamente: false,
});

const login = (email, clave) => request(app).post("/api/auth/login").send({ email, password: clave });

describe("versión 1.2 — integración con MongoDB aislado", () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    await mongoose.connect(process.env.MONGODB_URI);
    ({ default: Usuario } = await import("../src/models/Usuario.js"));
    ({ default: Organizacion } = await import("../src/models/Organizacion.js"));
    ({ default: Proyecto } = await import("../src/models/Proyecto.js"));
    ({ default: Donante } = await import("../src/models/Donante.js"));
    ({ default: Donacion } = await import("../src/models/Donacion.js"));
    ({ default: Campania } = await import("../src/models/Campania.js"));
    ({ default: Gasto } = await import("../src/models/Gasto.js"));
    ({ default: Auditoria } = await import("../src/models/Auditoria.js"));
    ({ default: app } = await import("../src/app.js"));
    users = {};
    for (const [key, rol] of Object.entries(roles)) users[key] = await Usuario.create({ nombre: `Integración ${key}`, email: `${key}@integration.test`, password, rol });
  });

  beforeEach(async () => {
    await Promise.all([Gasto, Donacion, Donante, Campania, Proyecto, Organizacion, Auditoria].map((modelo) => modelo.deleteMany({})));
    await Usuario.deleteMany({ email: { $not: /@integration\.test$/ } });
    await Usuario.updateMany({}, { $set: { refreshTokenHash: null, activo: true, debeCambiarPassword: false } });
    organizationA = await Organizacion.create({ nombre: "Organización Norte", descripcion: "Organización de prueba del norte" });
    organizationB = await Organizacion.create({ nombre: "Organización Sur", descripcion: "Organización de prueba del sur" });
    projectA = await Proyecto.create({
      nombre: "Proyecto Norte", organizacion: organizationA._id, presupuestoTotal: 10000,
      periodoInicio: new Date("2026-01-01T00:00:00.000Z"), periodoFin: new Date("2026-12-31T23:59:59.999Z"),
      rubros: [{ nombre: "Alimentos", montoAprobado: 10000 }],
    });
    donor = await Donante.create({ nombre: "Donante de financiación", email: "funding@integration.test", tipo: "individual" });
    await Donacion.create({ donante: donor._id, proyecto: projectA._id, monto: 10000 });
    await Usuario.updateOne({ _id: users.referente._id }, { $set: { organizacion: organizationA._id } });
    users.referente.organizacion = organizationA._id;
  });

  afterAll(async () => {
    await esperarBitacora(); // deja terminar las escrituras pendientes de la bitácora
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  describe("cuentas y contraseñas", () => {
    test("crea usuarios con email en minúsculas, conserva los puntos de Gmail y exige cambiar la contraseña inicial", async () => {
      const creado = await request(app).post("/api/usuarios").set(auth("admin")).send({ nombre: "Ana Pérez", email: "Ana.Perez@Gmail.com", password: temporal, rol: roles.auditoria });
      expect(creado.status).toBe(201);
      expect(creado.body.usuario.email).toBe("ana.perez@gmail.com");
      expect(creado.body.usuario.debeCambiarPassword).toBe(true);
      expect((await login("ANA.PEREZ@gmail.com", temporal)).status).toBe(200);
    });

    test("rechaza contraseñas que incumplen la política", async () => {
      for (const debil of ["corta", "todominusculas123!", "SinSimbolo123456", "Ana.Perez-2026!"]) {
        const respuesta = await request(app).post("/api/usuarios").set(auth("admin")).send({ nombre: "Ana Pérez", email: "ana.perez@gmail.com", password: debil, rol: roles.auditoria });
        expect(respuesta.status).toBe(400);
      }
      expect(await Usuario.countDocuments({ email: "ana.perez@gmail.com" })).toBe(0);
    });

    test("una cuenta nueva solo puede cambiar su contraseña; al hacerlo recupera el acceso y cierra las otras sesiones", async () => {
      await request(app).post("/api/usuarios").set(auth("admin")).send({ nombre: "Ana Pérez", email: "ana.perez@gmail.com", password: temporal, rol: roles.auditoria });
      const inicial = await login("ana.perez@gmail.com", temporal);
      const token = { Authorization: `Bearer ${inicial.body.accessToken}` };

      const bloqueada = await request(app).get("/api/proyectos").set(token);
      expect(bloqueada.status).toBe(403);
      expect(bloqueada.body.codigo).toBe("PASSWORD_CHANGE_REQUIRED");

      expect((await request(app).post("/api/auth/password").set(token).send({ passwordActual: "Incorrecta-2026!", passwordNueva: nuevaClave })).status).toBe(400);
      expect((await request(app).post("/api/auth/password").set(token).send({ passwordActual: temporal, passwordNueva: temporal })).status).toBe(400);

      const cambio = await request(app).post("/api/auth/password").set(token).send({ passwordActual: temporal, passwordNueva: nuevaClave });
      expect(cambio.status).toBe(200);
      expect(cambio.body.accessToken).toEqual(expect.any(String));

      expect((await request(app).get("/api/proyectos").set({ Authorization: `Bearer ${cambio.body.accessToken}` })).status).toBe(200);
      expect((await request(app).post("/api/auth/refresh").send({ refreshToken: inicial.body.refreshToken })).status).toBe(401);
      expect((await login("ana.perez@gmail.com", nuevaClave)).status).toBe(200);
      expect((await login("ana.perez@gmail.com", temporal)).status).toBe(401);
      expect((await Usuario.findOne({ email: "ana.perez@gmail.com" })).debeCambiarPassword).toBe(false);
    });

    test("el administrador restablece una contraseña y la persona debe cambiarla al ingresar", async () => {
      const reset = await request(app).post(`/api/usuarios/${users.referente._id}/password`).set(auth("admin")).send({ passwordNueva: "Reset-Temporal-2026!" });
      expect(reset.status).toBe(200);
      expect((await login(users.referente.email, password)).status).toBe(401);
      const ingreso = await login(users.referente.email, "Reset-Temporal-2026!");
      expect(ingreso.status).toBe(200);
      const bloqueada = await request(app).get("/api/proyectos").set({ Authorization: `Bearer ${ingreso.body.accessToken}` });
      expect(bloqueada.body.codigo).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    test("solo el administrador restablece contraseñas y no puede hacerlo sobre su propia cuenta", async () => {
      expect((await request(app).post(`/api/usuarios/${users.auditoria._id}/password`).set(auth("referente")).send({ passwordNueva: temporal })).status).toBe(403);
      expect((await request(app).post(`/api/usuarios/${users.admin._id}/password`).set(auth("admin")).send({ passwordNueva: temporal })).status).toBe(409);
    });

    test("no permite desactivarse ni cambiarse el propio rol", async () => {
      expect((await request(app).patch(`/api/usuarios/${users.admin._id}/estado`).set(auth("admin"))).status).toBe(409);
      const propio = await request(app).put(`/api/usuarios/${users.admin._id}`).set(auth("admin")).send({ nombre: "Administrador", rol: roles.auditoria });
      expect(propio.status).toBe(409);
    });

    test("edita rol y organización: el referente exige organización y el cambio cierra sus sesiones", async () => {
      const sinOrganizacion = await request(app).put(`/api/usuarios/${users.auditoria._id}`).set(auth("admin")).send({ nombre: "Auditoría", rol: roles.referente });
      expect(sinOrganizacion.status).toBe(400);

      await Usuario.updateOne({ _id: users.auditoria._id }, { $set: { refreshTokenHash: "hash-previo" } });
      const editado = await request(app).put(`/api/usuarios/${users.auditoria._id}`).set(auth("admin")).send({ nombre: "Auditoría", rol: roles.referente, organizacion: String(organizationA._id) });
      expect(editado.status).toBe(200);
      expect(editado.body.usuario.rol).toBe(roles.referente);
      const guardado = await Usuario.findById(users.auditoria._id).select("+refreshTokenHash");
      expect(guardado.refreshTokenHash).toBeNull();
      await Usuario.updateOne({ _id: users.auditoria._id }, { $set: { rol: roles.auditoria, organizacion: null } });
    });
  });

  describe("proyectos", () => {
    test("un proyecto inactivo no recibe donaciones ni rendiciones y puede reactivarse", async () => {
      const inactivo = await request(app).patch(`/api/proyectos/${projectA._id}/estado`).set(auth("mesa")).send({ activo: false });
      expect(inactivo.status).toBe(200);
      expect(inactivo.body.activo).toBe(false);

      expect((await request(app).post("/api/donaciones").set(auth("admin")).send({ donante: String(donor._id), proyecto: String(projectA._id), monto: 100 })).status).toBe(409);
      expect((await uploadExpense("referente", expenseForm(projectA, 100))).status).toBe(409);
      const listado = await request(app).get("/api/proyectos").set(auth("referente"));
      expect(listado.body).toHaveLength(0);

      await request(app).patch(`/api/proyectos/${projectA._id}/estado`).set(auth("mesa")).send({ activo: true });
      expect((await request(app).post("/api/donaciones").set(auth("admin")).send({ donante: String(donor._id), proyecto: String(projectA._id), monto: 100 })).status).toBe(201);
    });

    test("no permite reducir el presupuesto por debajo de lo comprometido ni quitar rubros con rendiciones", async () => {
      await seedGasto(600);
      const cuerpo = (cambios) => ({
        nombre: "Proyecto Norte", organizacion: String(organizationA._id), presupuestoTotal: 10000, periodoInicio: "2026-01-01", periodoFin: "2026-12-31",
        rubros: [{ nombre: "Alimentos", montoAprobado: 10000 }], ...cambios,
      });
      expect((await request(app).put(`/api/proyectos/${projectA._id}`).set(auth("mesa")).send(cuerpo({ presupuestoTotal: 500 }))).status).toBe(409);
      expect((await request(app).put(`/api/proyectos/${projectA._id}`).set(auth("mesa")).send(cuerpo({ rubros: [{ nombre: "Otro", montoAprobado: 10000 }] }))).status).toBe(409);
      const ampliado = await request(app).put(`/api/proyectos/${projectA._id}`).set(auth("mesa")).send(cuerpo({ presupuestoTotal: 20000, rubros: [{ nombre: "Alimentos", montoAprobado: 20000 }] }));
      expect(ampliado.status).toBe(200);
    });

    test("el referente no accede a los datos de donantes ni por la API ni por la web", async () => {
      expect((await request(app).get(`/api/proyectos/${projectA._id}/donaciones`).set(auth("referente"))).status).toBe(403);

      const comoReferente = await request(app).get(`/proyectos/${projectA._id}`).set("Cookie", `access_token=${bearerFor("referente")}`);
      expect(comoReferente.status).toBe(200);
      expect(comoReferente.text).not.toContain("Donante de financiación");

      const comoAdmin = await request(app).get(`/proyectos/${projectA._id}`).set("Cookie", `access_token=${bearerFor("admin")}`);
      expect(comoAdmin.text).toContain("Donante de financiación");
    });
  });

  describe("validaciones de negocio", () => {
    test("rechaza fechas futuras y montos fuera de rango en donaciones y rendiciones", async () => {
      const proximoAnio = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString();
      const donacion = (extra) => request(app).post("/api/donaciones").set(auth("admin")).send({ donante: String(donor._id), proyecto: String(projectA._id), monto: 100, ...extra });
      expect((await donacion({ fecha: proximoAnio })).status).toBe(400);
      expect((await donacion({ monto: 2_000_000_000 })).status).toBe(400);
      expect((await uploadExpense("referente", { ...expenseForm(projectA, 100), fecha: "2099-01-01" })).status).toBe(400);
      expect((await uploadExpense("referente", { ...expenseForm(projectA, 100), monto: "2000000000" })).status).toBe(400);
    });

    test("una donación de un proyecto con rendiciones no puede modificarse ni eliminarse", async () => {
      const donacion = await Donacion.findOne({ proyecto: projectA._id });
      await seedGasto(600);
      const cambio = await request(app).put(`/api/donaciones/${donacion._id}`).set(auth("admin")).send({ donante: String(donor._id), proyecto: String(projectA._id), monto: 9999 });
      expect(cambio.status).toBe(409);
      expect((await request(app).delete(`/api/donaciones/${donacion._id}`).set(auth("admin"))).status).toBe(409);
      expect((await Donacion.findById(donacion._id)).monto).toBe(10000);
    });

    test("no admite donaciones a campañas finalizadas ni fuera de su período", async () => {
      const dia = 24 * 60 * 60 * 1000;
      const ahora = Date.now();
      const crearCampania = (extra) => Campania.create({ nombre: "Campaña de prueba", meta: 1000, fechaInicio: new Date(ahora - 10 * dia), fechaFin: new Date(ahora + 10 * dia), ...extra });
      const donar = (campania, extra = {}) => request(app).post("/api/donaciones").set(auth("admin")).send({ donante: String(donor._id), campania: String(campania._id), monto: 100, ...extra });

      expect((await donar(await crearCampania({ activa: false }))).status).toBe(409);
      expect((await donar(await crearCampania(), { fecha: new Date(ahora - 20 * dia).toISOString() })).status).toBe(400);
      expect((await donar(await crearCampania())).status).toBe(201);
    });

    test("el reporte de campaña incluye las donaciones hechas el último día", async () => {
      const dia = 24 * 60 * 60 * 1000;
      const ahora = new Date();
      const inicioDeHoy = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
      const campania = await Campania.create({ nombre: "Campaña que termina hoy", meta: 2000, fechaInicio: new Date(ahora.getTime() - 5 * dia), fechaFin: inicioDeHoy });
      await Donacion.create({ donante: donor._id, proyecto: projectA._id, campania: campania._id, monto: 1000, fecha: ahora });

      const reporte = await request(app).get(`/admin/campanias/${campania._id}/reporte`).set("Cookie", `access_token=${bearerFor("admin")}`);
      expect(reporte.status).toBe(200);
      expect(reporte.text).toMatch(/1\.000/);
    });
  });

  describe("bitácora de auditoría", () => {
    test("registra las escrituras con su autor y se consulta con filtros y paginación", async () => {
      const creada = await request(app).post("/api/donaciones").set(auth("admin")).send({ donante: String(donor._id), proyecto: String(projectA._id), monto: 250 });
      expect(creada.status).toBe(201);
      await esperarBitacora();

      const registros = await Auditoria.find({ ruta: "/api/donaciones", metodo: "POST" });
      expect(registros).toHaveLength(1);
      expect(registros[0]).toMatchObject({ email: users.admin.email, rol: roles.admin, estado: 201, resultado: "ok" });

      const consulta = await request(app).get("/api/auditoria?metodo=POST&limite=1").set(auth("admin"));
      expect(consulta.status).toBe(200);
      expect(consulta.body.datos).toHaveLength(1);
      expect(consulta.body.total).toBeGreaterThanOrEqual(1);
      expect((await request(app).get("/api/auditoria").set(auth("auditoria"))).status).toBe(200);
      expect((await request(app).get("/api/auditoria").set(auth("referente"))).status).toBe(403);
    });

    test("registra los intentos de ingreso fallidos y nunca guarda contraseñas", async () => {
      await login(users.admin.email, "Clave-Incorrecta-2026!");
      await esperarBitacora();
      const fallido = await Auditoria.findOne({ ruta: "/api/auth/login", resultado: "rechazado" });
      expect(fallido).not.toBeNull();
      expect(fallido.usuario).toBeNull();
      const todo = JSON.stringify(await Auditoria.find({}).lean());
      expect(todo).not.toContain("Clave-Incorrecta-2026!");
      expect(todo).not.toContain(password);
    });
  });

  describe("concurrencia", () => {
    test("dos rendiciones simultáneas no pueden superar el saldo del proyecto", async () => {
      const [a, b] = await Promise.all([uploadExpense("referente", expenseForm(projectA, 6000)), uploadExpense("referente", expenseForm(projectA, 6000))]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
      expect(await Gasto.countDocuments({ proyecto: projectA._id })).toBe(1);
    });

    test("dos revisiones simultáneas de la misma rendición se resuelven una sola vez", async () => {
      const gasto = await seedGasto(600);
      const revisar = () => request(app).patch(`/api/gastos/${gasto._id}/revision`).set(auth("auditoria")).send({ accion: "aprobar" });
      const [a, b] = await Promise.all([revisar(), revisar()]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      expect((await Gasto.findById(gasto._id)).estado).toBe("aprobado");
    });
  });
});
