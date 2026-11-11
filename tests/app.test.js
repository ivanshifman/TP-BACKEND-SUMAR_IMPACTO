import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import auditoriaService from "../src/services/AuditoriaService.js";
import app from "../src/app.js";

describe("HTTP app", () => {
  const registrarOriginal = auditoriaService.registrar;

  beforeAll(() => {
    auditoriaService.registrar = async () => {};
  });

  afterAll(async () => {
    auditoriaService.registrar = registrarOriginal;
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  test("reports degraded health when MongoDB is disconnected", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: "degraded",
      service: "sumarimpacto-api",
      database: "disconnected",
    });
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  test("requires authentication for protected API routes", async () => {
    const response = await request(app).get("/api/proyectos");

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: true, mensaje: "Autenticación requerida." });
  });

  test("redirects unauthenticated web requests to login", async () => {
    const response = await request(app).get("/rendiciones");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/login?next=%2Frendiciones");
  });

  test("rejects state-changing API requests from untrusted origins", async () => {
    const response = await request(app)
      .post("/api/usuarios")
      .set("Origin", "https://untrusted.example")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: true, codigo: "FORBIDDEN" });
  });
});
