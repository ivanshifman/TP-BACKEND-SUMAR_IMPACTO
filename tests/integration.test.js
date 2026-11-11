import { afterAll, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "integration-access-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ";
process.env.JWT_REFRESH_SECRET = "integration-refresh-secret-9876543210-zyxwvutsrqponmlkjihgfedcba";
process.env.JWT_ISSUER = "sumarimpacto-integration-test";
process.env.JWT_AUDIENCE = "sumarimpacto-integration-client";

let app;
let Usuario;
let Organizacion;
let Proyecto;
let Donante;
let Donacion;
let Campania;
let Gasto;
let mongo;

const roles = {
  admin: "administrador",
  referente: "referente_territorial",
  auditoria: "auditoria",
  mesa: "mesa_coordinadora",
  administracion: "administracion",
  trabajoSocial: "trabajo_social",
};
const password = "Integration123!";
let users;
let organizationA;
let organizationB;
let projectA;
let projectB;

async function bearerFor(role) {
  const user = users[role];
  return jwt.sign(
    { rol: user.rol, organizacion: user.organizacion ? String(user.organizacion) : null },
    process.env.JWT_ACCESS_SECRET,
    {
      subject: String(user._id),
      expiresIn: "15m",
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      algorithm: "HS256",
    },
  );
}

function expenseForm(project = projectA, amount = 400) {
  return {
    proyecto: String(project._id),
    monto: String(amount),
    fecha: "2026-06-15",
    rubro: "Alimentos",
    descripcion: "Compra de alimentos",
  };
}

function validPdf() {
  return Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
}

async function uploadExpense(role, form, file = validPdf(), filename = "comprobante.pdf", contentType = "application/pdf") {
  const token = await bearerFor(role);
  let call = request(app).post("/api/gastos").set("Authorization", `Bearer ${token}`);
  for (const [key, value] of Object.entries(form)) call = call.field(key, value);
  if (file) call = call.attach("comprobante", file, { filename, contentType });
  return call;
}

async function seedGasto(options = {}) {
  const { project = projectA, uploader = users.referente, amount = 600, state = "en_revision", requiresBoard = false, autoApproved = false } = options;
  return Gasto.create({
    proyecto: project._id,
    monto: amount,
    fecha: new Date("2026-06-15T12:00:00.000Z"),
    descripcion: "Gasto de integración",
    rubro: "Alimentos",
    comprobante: { nombre: "test.pdf", mimeType: "application/pdf", tamanio: validPdf().length, contenido: validPdf() },
    estado: state,
    porcentajePresupuesto: amount / 100,
    reglasBasicasCumplidas: true,
    cargadoPor: uploader._id,
    requiereMesa: requiresBoard,
    aprobadoAutomaticamente: autoApproved,
  });
}

describe("API integration with isolated MongoDB", () => {
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
    ({ default: app } = await import("../src/app.js"));

    users = {};
    for (const [key, rol] of Object.entries(roles)) {
      users[key] = await Usuario.create({ nombre: `Integración ${key}`, email: `${key}@integration.test`, password, rol });
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Gasto.deleteMany({}),
      Donacion.deleteMany({}),
      Donante.deleteMany({}),
      Campania.deleteMany({}),
      Proyecto.deleteMany({}),
      Organizacion.deleteMany({}),
    ]);
    await Usuario.updateMany({}, { $set: { refreshTokenHash: null, activo: true } });
    organizationA = await Organizacion.create({ nombre: "Organización Norte", descripcion: "Organización de prueba del norte" });
    organizationB = await Organizacion.create({ nombre: "Organización Sur", descripcion: "Organización de prueba del sur" });
    projectA = await Proyecto.create({
      nombre: "Proyecto Norte",
      organizacion: organizationA._id,
      presupuestoTotal: 10000,
      periodoInicio: new Date("2026-01-01T00:00:00.000Z"),
      periodoFin: new Date("2026-12-31T23:59:59.999Z"),
      rubros: [{ nombre: "Alimentos", montoAprobado: 10000 }],
    });
    projectB = await Proyecto.create({
      nombre: "Proyecto Sur",
      organizacion: organizationB._id,
      presupuestoTotal: 10000,
      periodoInicio: new Date("2026-01-01T00:00:00.000Z"),
      periodoFin: new Date("2026-12-31T23:59:59.999Z"),
      rubros: [{ nombre: "Alimentos", montoAprobado: 10000 }],
    });
    const fundingDonor = await Donante.create({
      nombre: "Donante de financiación",
      email: "funding@integration.test",
      tipo: "individual",
    });
    await Donacion.create([
      { donante: fundingDonor._id, proyecto: projectA._id, monto: 10000 },
      { donante: fundingDonor._id, proyecto: projectB._id, monto: 10000 },
    ]);
    await Usuario.updateOne({ _id: users.referente._id }, { $set: { organizacion: organizationA._id } });
    users.referente.organizacion = organizationA._id;
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150)); // deja terminar las escrituras pendientes de la bitácora
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  describe("authentication and token rotation", () => {
    test("logs in, returns tokens, exposes the profile and rotates refresh tokens; rejects replay", async () => {
      const login = await request(app).post("/api/auth/login").send({ email: users.admin.email, password });
      expect(login.status).toBe(200);
      expect(login.body).toMatchObject({ tokenType: "Bearer", usuario: { rol: roles.admin } });
      expect(login.body.accessToken).toEqual(expect.any(String));
      expect(login.body.refreshToken).toEqual(expect.any(String));
      expect(login.headers["set-cookie"]).toHaveLength(2);

      const profile = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
      expect(profile.status).toBe(200);
      expect(profile.body.usuario.email).toBe(users.admin.email);

      const refreshed = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

      const replay = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
      expect(replay.status).toBe(401);
      const nextRefresh = await request(app).post("/api/auth/refresh").send({ refreshToken: refreshed.body.refreshToken });
      expect(nextRefresh.status).toBe(200);
    });

    test("does not authenticate wrong-password or inactive users", async () => {
      const wrongPassword = await request(app).post("/api/auth/login").send({ email: users.admin.email, password: "WrongPassword123!" });
      expect(wrongPassword.status).toBe(401);
      expect(wrongPassword.body.mensaje).toBe("Credenciales inválidas.");

      await Usuario.updateOne({ _id: users.admin._id }, { $set: { activo: false } });
      const inactiveLogin = await request(app).post("/api/auth/login").send({ email: users.admin.email, password });
      expect(inactiveLogin.status).toBe(401);

      const inactiveToken = await bearerFor("admin");
      const protectedRequest = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${inactiveToken}`);
      expect(protectedRequest.status).toBe(401);
    });

    test("rejects expired access tokens", async () => {
      const expiredToken = jwt.sign(
        { rol: users.admin.rol, organizacion: null },
        process.env.JWT_ACCESS_SECRET,
        {
          subject: String(users.admin._id),
          expiresIn: -1,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
          algorithm: "HS256",
        },
      );
      const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
    });

    test("logout revokes the refresh token in persistent storage", async () => {
      const login = await request(app).post("/api/auth/login").send({ email: users.admin.email, password });
      const logout = await request(app).post("/api/auth/logout").send({ refreshToken: login.body.refreshToken });
      expect(logout.status).toBe(204);
      const refresh = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
      expect(refresh.status).toBe(401);
    });
  });

  describe("role authorization and organization isolation", () => {
    test.each([
      ["admin", 201],
      ["mesa", 201],
      ["trabajoSocial", 201],
      ["referente", 403],
      ["auditoria", 403],
      ["administracion", 403],
    ])("project creation authorization for role %s", async (role, expectedStatus) => {
      const token = await bearerFor(role);
      const response = await request(app).post("/api/proyectos").set("Authorization", `Bearer ${token}`).send({
        nombre: `Proyecto creado por ${role}`,
        organizacion: String(organizationA._id),
        presupuestoTotal: 1000,
        periodoInicio: "2026-01-01",
        periodoFin: "2026-12-31",
        rubros: [{ nombre: "Alimentos", montoAprobado: 1000 }],
      });
      expect(response.status).toBe(expectedStatus);
    });

    test.each([
      ["admin", 200],
      ["mesa", 200],
      ["auditoria", 200],
      ["administracion", 200],
      ["trabajoSocial", 200],
      ["referente", 403],
    ])("organization read authorization for role %s", async (role, expectedStatus) => {
      const token = await bearerFor(role);
      const response = await request(app).get("/api/organizaciones").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(expectedStatus);
    });

    test.each([
      ["admin", 201],
      ["administracion", 201],
      ["referente", 403],
      ["auditoria", 403],
      ["mesa", 403],
      ["trabajoSocial", 403],
    ])("donation creation authorization for role %s", async (role, expectedStatus) => {
      const donor = await Donante.create({ nombre: "Donante de prueba", email: `${role}@donor.test`, tipo: "individual" });
      const token = await bearerFor(role);
      const response = await request(app).post("/api/donaciones").set("Authorization", `Bearer ${token}`).send({
        donante: String(donor._id),
        proyecto: String(projectA._id),
        monto: 100,
      });
      expect(response.status).toBe(expectedStatus);
    });

    test("limits a referente's project list and denies access to another organization's project", async () => {
      const token = await bearerFor("referente");
      const list = await request(app).get(`/api/proyectos?organizacionId=${organizationB._id}`).set("Authorization", `Bearer ${token}`);
      expect(list.status).toBe(200);
      expect(list.body.map((project) => project._id)).toEqual([String(projectA._id)]);

      const detail = await request(app).get(`/api/proyectos/${projectB._id}`).set("Authorization", `Bearer ${token}`);
      expect(detail.status).toBe(403);
      const balance = await request(app).get(`/api/proyectos/${projectB._id}/saldo`).set("Authorization", `Bearer ${token}`);
      expect(balance.status).toBe(403);
    });
  });

  describe("file uploads, RF-02 transitions and persisted errors", () => {
    test("persists a valid PDF receipt and rejects missing, mismatched and oversized files", async () => {
      const valid = await uploadExpense("referente", expenseForm(), validPdf());
      expect(valid.status).toBe(201);
      expect(valid.body.rendicion).toMatchObject({ estado: "aprobado", aprobadoAutomaticamente: true });
      const stored = await Gasto.findById(valid.body.rendicion._id).select("+comprobante.contenido");
      expect(stored.comprobante.contenido.toString()).toContain("%PDF-1.4");

      const missing = await uploadExpense("referente", expenseForm(), null);
      expect(missing.status).toBe(400);

      const mismatch = await uploadExpense("referente", expenseForm(), Buffer.from("not a pdf"), "fake.pdf", "application/pdf");
      expect(mismatch.status).toBe(400);

      const oversized = await uploadExpense("referente", expenseForm(), Buffer.concat([validPdf(), Buffer.alloc(5 * 1024 * 1024)]));
      expect(oversized.status).toBe(400);
      expect(oversized.body.mensaje).toMatch(/5 MB/);
      expect(await Gasto.countDocuments()).toBe(1);
    });

    test("rejects MIME types outside the receipt allowlist", async () => {
      const response = await uploadExpense("referente", expenseForm(), Buffer.from("GIF89a"), "image.gif", "image/gif");
      expect(response.status).toBe(400);
      expect(await Gasto.countDocuments()).toBe(0);
    });

    test.each([
      ["JPEG", Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg", "receipt.jpg"],
      ["PNG", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png", "receipt.png"],
      ["WEBP", Buffer.from("RIFF0000WEBP"), "image/webp", "receipt.webp"],
    ])("accepts a %s receipt with matching signature", async (_format, bytes, mimeType, filename) => {
      const response = await uploadExpense("referente", expenseForm(), bytes, filename, mimeType);
      expect(response.status).toBe(201);
      expect(response.body.rendicion.estado).toBe("aprobado");
    });

    test("enforces organization scope when a referente submits a receipt", async () => {
      const response = await uploadExpense("referente", expenseForm(projectB), validPdf());
      expect(response.status).toBe(403);
      expect(await Gasto.countDocuments()).toBe(0);
    });

    test("routes invalid rubric and out-of-period receipts to audit instead of auto-approving", async () => {
      const invalidRubric = await uploadExpense("referente", { ...expenseForm(projectA, 100), rubro: "Otro" });
      expect(invalidRubric.status).toBe(201);
      expect(invalidRubric.body.rendicion.estado).toBe("en_revision");
      expect(invalidRubric.body.rendicion.observacion).toMatch(/rubro/);

      const outOfPeriod = await uploadExpense("referente", { ...expenseForm(projectA, 100), fecha: "2025-12-31" });
      expect(outOfPeriod.status).toBe(201);
      expect(outOfPeriod.body.rendicion.estado).toBe("en_revision");
      expect(outOfPeriod.body.rendicion.observacion).toMatch(/fuera del período/);
    });

    test("enforces the monthly auto-approval cap and prevents exceeding the available balance", async () => {
      const first = await uploadExpense("referente", expenseForm(projectA, 400));
      expect(first.body.rendicion.estado).toBe("aprobado");
      const second = await uploadExpense("referente", expenseForm(projectA, 200));
      expect(second.body.rendicion.estado).toBe("en_revision");
      expect(second.body.rendicion.observacion).toMatch(/acumulado mensual/);

      const overBalance = await uploadExpense("referente", expenseForm(projectA, 10001));
      expect(overBalance.status).toBe(409);
    });

    test("auditor resolves a mid-range receipt and cannot resolve a receipt they submitted", async () => {
      const submittedByAuditor = await seedGasto({ uploader: users.auditoria, amount: 600 });
      const auditorToken = await bearerFor("auditoria");
      const adminToken = await bearerFor("admin");
      const adminReview = await request(app).patch(`/api/gastos/${submittedByAuditor._id}/revision`)
        .set("Authorization", `Bearer ${adminToken}`).send({ accion: "aprobar" });
      expect(adminReview.status).toBe(403);
      const selfReview = await request(app).patch(`/api/gastos/${submittedByAuditor._id}/revision`)
        .set("Authorization", `Bearer ${auditorToken}`).send({ accion: "aprobar" });
      expect(selfReview.status).toBe(403);

      const submittedByReferente = await seedGasto({ amount: 600 });
      const review = await request(app).patch(`/api/gastos/${submittedByReferente._id}/revision`)
        .set("Authorization", `Bearer ${auditorToken}`).send({ accion: "aprobar" });
      expect(review.status).toBe(200);
      expect(review.body.rendicion.estado).toBe("aprobado");
      const persisted = await Gasto.findById(submittedByReferente._id);
      expect(String(persisted.aprobadoPor)).toBe(String(users.auditoria._id));
    });

    test("requires audit then board approval for high-value receipts and blocks invalid transitions", async () => {
      const gasto = await seedGasto({ amount: 3500, requiresBoard: true });
      const auditorToken = await bearerFor("auditoria");
      const mesaToken = await bearerFor("mesa");
      const adminToken = await bearerFor("admin");
      const adminRead = await request(app).get("/api/gastos").set("Authorization", `Bearer ${adminToken}`);
      expect(adminRead.status).toBe(200);
      expect(adminRead.body).toHaveLength(1);
      const adminWrite = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${adminToken}`).send({ accion: "aprobar" });
      expect(adminWrite.status).toBe(403);
      const directBoardDecision = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${mesaToken}`).send({ accion: "aprobar" });
      expect(directBoardDecision.status).toBe(403);

      const audit = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${auditorToken}`).send({ accion: "aprobar" });
      expect(audit.status).toBe(200);
      expect(audit.body.rendicion.estado).toBe("pendiente_mesa");

      const repeatedAudit = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${auditorToken}`).send({ accion: "aprobar" });
      expect(repeatedAudit.status).toBe(403);

      const board = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${mesaToken}`).send({ accion: "aprobar" });
      expect(board.status).toBe(200);
      expect(board.body.rendicion.estado).toBe("aprobado");
      expect(String(board.body.rendicion.aprobadoPor)).toBe(String(users.mesa._id));

      const finalStateChange = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${mesaToken}`).send({ accion: "observar", observacion: "Cambio posterior" });
      expect(finalStateChange.status).toBe(409);
    });

    test("requires a reason to observe and persists the final observation", async () => {
      const gasto = await seedGasto();
      const token = await bearerFor("auditoria");
      const missingReason = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${token}`).send({ accion: "observar" });
      expect(missingReason.status).toBe(400);

      const observed = await request(app).patch(`/api/gastos/${gasto._id}/revision`)
        .set("Authorization", `Bearer ${token}`).send({ accion: "observar", observacion: "Falta documentación" });
      expect(observed.status).toBe(200);
      const persisted = await Gasto.findById(gasto._id);
      expect(persisted.estado).toBe("observado");
      expect(persisted.observacion).toBe("Falta documentación");
    });

    test("maps malformed ids, missing resources and duplicate persistent records to API errors", async () => {
      const token = await bearerFor("admin");
      const malformed = await request(app).get("/api/proyectos/not-an-object-id").set("Authorization", `Bearer ${token}`);
      expect(malformed.status).toBe(400);

      const missing = await request(app).get(`/api/proyectos/${new mongoose.Types.ObjectId()}`).set("Authorization", `Bearer ${token}`);
      expect(missing.status).toBe(404);

      const donorBody = { nombre: "Unique Donor", email: "unique@integration.test", tipo: "individual" };
      const created = await request(app).post("/api/donantes").set("Authorization", `Bearer ${token}`).send(donorBody);
      expect(created.status).toBe(201);
      const duplicate = await request(app).post("/api/donantes").set("Authorization", `Bearer ${token}`).send(donorBody);
      expect(duplicate.status).toBe(409);
    });

  });

  describe("campaign reports", () => {
    test("aggregates campaign donations, renders the report and exports a PDF", async () => {
      const now = new Date();
      const campaign = await Campania.create({
        nombre: "Campaña de integración",
        descripcion: "Campaña para validar reportes de integración",
        meta: 2000,
        fechaInicio: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        fechaFin: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
      const donor = await Donante.create({ nombre: "Donante Reporte", email: "report@integration.test", tipo: "individual" });
      await Donacion.create([
        { donante: donor._id, proyecto: projectA._id, campania: campaign._id, monto: 1000, fecha: now },
        { donante: donor._id, proyecto: projectA._id, campania: campaign._id, monto: 500, fecha: now },
      ]);
      const token = await bearerFor("admin");
      const report = await request(app).get(`/admin/campanias/${campaign._id}/reporte`).set("Cookie", `access_token=${token}`);
      expect(report.status).toBe(200);
      expect(report.text).toContain("Campaña de integración");
      expect(report.text).toMatch(/1\.500/);
      expect(report.text).toContain("75");

      const pdf = await request(app).get(`/admin/campanias/${campaign._id}/reporte.pdf`)
        .set("Cookie", `access_token=${token}`)
        .buffer(true)
        .parse((response, callback) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => callback(null, Buffer.concat(chunks)));
        });
      expect(pdf.status).toBe(200);
      expect(pdf.headers["content-type"]).toMatch(/application\/pdf/);
      expect(pdf.body.subarray(0, 4).toString()).toBe("%PDF");
    });
  });
});
