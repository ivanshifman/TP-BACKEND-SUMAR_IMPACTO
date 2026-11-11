import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";
import app from "../src/app.js";
import { generarMatriz } from "./helpers/matrizPermisos.js";
import { GRUPOS, puedeRol, rolesDelGrupo } from "../src/config/permisos.js";
import { ROLES } from "../src/config/security.js";

describe("matriz de permisos", () => {
  test("coincide con la referencia versionada (cualquier cambio de permisos debe ser intencional)", () => {
    const esperada = fs.readFileSync(new URL("./fixtures/matriz-permisos.txt", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    // Si cambiaste permisos a propósito: npm run permisos > tests/fixtures/matriz-permisos.txt
    expect(generarMatriz(app)).toBe(esperada);
  });

  test("todas las rutas, salvo las públicas, exigen autenticación", () => {
    const publicas = generarMatriz(app).split("\n").filter((linea) => linea.includes("PUBLICA")).map((linea) => linea.split(/\s+/).slice(0, 2).join(" "));
    expect(publicas.sort()).toEqual([
      "GET /health",
      "GET /login",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/refresh",
      "POST /login",
      "POST /logout",
    ]);
  });
});

describe("grupos de permisos", () => {
  test("el administrador técnico no puede cargar ni resolver rendiciones", () => {
    expect(puedeRol("CARGA_RENDICIONES", ROLES.ADMIN)).toBe(false);
    expect(puedeRol("REVISION_RENDICIONES", ROLES.ADMIN)).toBe(false);
  });

  test("solo el referente carga rendiciones y solo Auditoría y Mesa las resuelven", () => {
    expect([...rolesDelGrupo("CARGA_RENDICIONES")]).toEqual([ROLES.REFERENTE]);
    expect([...rolesDelGrupo("REVISION_RENDICIONES")].sort()).toEqual([ROLES.AUDITORIA, ROLES.MESA].sort());
  });

  test("el referente no ve datos de donantes y donaciones", () => {
    expect(puedeRol("LECTURA_FINANCIERA", ROLES.REFERENTE)).toBe(false);
  });

  test("un grupo inexistente falla de inmediato en lugar de otorgar acceso", () => {
    expect(() => rolesDelGrupo("GRUPO_QUE_NO_EXISTE")).toThrow("Grupo de permisos inexistente");
  });

  test("todos los grupos usan únicamente roles válidos", () => {
    const validos = new Set(Object.values(ROLES));
    for (const [nombre, roles] of Object.entries(GRUPOS)) {
      for (const rol of roles) expect({ nombre, valido: validos.has(rol) }).toEqual({ nombre, valido: true });
    }
  });
});
