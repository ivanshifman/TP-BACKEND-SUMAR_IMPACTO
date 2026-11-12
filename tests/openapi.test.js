import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import app from "../src/app.js";
import { ROLE_VALUES } from "../src/config/security.js";
import { generarMatriz } from "./helpers/matrizPermisos.js";

const openapiPath = new URL("../docs/openapi.yaml", import.meta.url);
const spec = yaml.load(readFileSync(openapiPath, "utf8"));
const METODOS_HTTP = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);

function normalizarRuta(ruta) {
  return ruta.replace(/:([^/]+)/g, "{$1}").replace(/\/+$/, "") || "/";
}

function operacionesReales() {
  return generarMatriz(app)
    .trim()
    .split(/\r?\n/)
    .map((linea) => {
      const [metodo, ruta, autenticacion, ...roles] = linea.trim().split(/\s+/);
      const rolesTexto = roles.join(" ");
      return {
        metodo: metodo.toLowerCase(),
        ruta: normalizarRuta(ruta),
        autenticada: autenticacion === "AUTH",
        roles: rolesTexto === "(sin restricción de rol)" ? [] : rolesTexto.split(","),
      };
    })
    .filter(({ ruta }) => ruta === "/health" || ruta.startsWith("/api/"));
}

function operacionesDocumentadas() {
  return Object.entries(spec.paths).flatMap(([ruta, pathItem]) =>
    Object.entries(pathItem)
      .filter(([metodo]) => METODOS_HTTP.has(metodo))
      .map(([metodo, operacion]) => ({
        metodo,
        ruta: normalizarRuta(ruta),
        operacion,
      }))
  );
}

function resolverReferenciaLocal(referencia) {
  if (!referencia.startsWith("#/")) throw new Error(`Referencia externa no permitida: ${referencia}`);
  return referencia
    .slice(2)
    .split("/")
    .map((segmento) => segmento.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((valor, segmento) => valor?.[segmento], spec);
}

function validarReferencias(valor) {
  if (Array.isArray(valor)) {
    valor.forEach(validarReferencias);
    return;
  }
  if (!valor || typeof valor !== "object") return;
  if (typeof valor.$ref === "string") {
    if (resolverReferenciaLocal(valor.$ref) === undefined) {
      throw new Error(`Referencia OpenAPI sin destino: ${valor.$ref}`);
    }
  }
  Object.values(valor).forEach(validarReferencias);
}

describe("Contrato OpenAPI", () => {
  test("documenta exactamente las rutas y métodos reales de la API", () => {
    const reales = operacionesReales().map(({ metodo, ruta }) => `${metodo} ${ruta}`).sort();
    const documentadas = operacionesDocumentadas()
      .map(({ metodo, ruta }) => `${metodo} ${ruta}`)
      .sort();

    expect(documentadas).toEqual(reales);
  });

  test("sincroniza autenticación y roles con los middlewares de Express", () => {
    for (const real of operacionesReales()) {
      const documentada = spec.paths[real.ruta]?.[real.metodo];
      expect(documentada).toBeDefined();
      expect(documentada["x-roles"] ?? []).toEqual(real.roles);

      const seguridad = Object.hasOwn(documentada, "security")
        ? documentada.security
        : spec.security;
      if (real.autenticada) {
        expect(seguridad).toEqual([{ bearerAuth: [] }, { accessTokenCookie: [] }]);
        expect(documentada.responses["401"]).toBeDefined();
      } else {
        expect(seguridad).toEqual([]);
      }
      if (real.roles.length > 0) expect(documentada.responses["403"]).toBeDefined();
      expect((documentada["x-roles"] ?? []).every((rol) => ROLE_VALUES.includes(rol))).toBe(true);
    }
  });

  test("incluye producción en Render y desarrollo local", () => {
    expect(spec.servers.map(({ url }) => url)).toEqual([
      "https://tp-backend-sumar-impacto.onrender.com",
      "http://localhost:3000",
    ]);
  });

  test("cada operación declara respuesta y esquema para los éxitos con cuerpo", () => {
    for (const { metodo, ruta, operacion } of operacionesDocumentadas()) {
      expect(operacion.summary).toBeTruthy();
      expect(operacion.responses).toBeTruthy();
      const exitos = Object.entries(operacion.responses).filter(([codigo]) => codigo.startsWith("2"));
      expect(exitos.length).toBeGreaterThan(0);

      for (const [codigo, respuesta] of exitos) {
        if (codigo === "204") {
          expect(respuesta.content).toBeUndefined();
        } else {
          expect(respuesta.content?.["application/json"]?.schema).toBeDefined();
        }
      }

      if (operacion.requestBody) {
        expect(Object.keys(operacion.requestBody.content ?? {}).length).toBeGreaterThan(0);
      }
    }
  });

  test("todas las referencias OpenAPI resuelven dentro del documento", () => {
    expect(() => validarReferencias(spec)).not.toThrow();
  });
});
