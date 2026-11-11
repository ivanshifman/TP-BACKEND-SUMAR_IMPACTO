import { describe, expect, test } from "@jest/globals";
import { evaluarPassword, esPasswordValida } from "../src/utils/politicaPassword.js";

describe("política de contraseñas", () => {
  test("acepta una contraseña que cumple todos los requisitos", () => {
    expect(evaluarPassword("Contraseña-Segura-2026!")).toEqual([]);
    expect(esPasswordValida("Integration123!")).toBe(true);
  });

  test("rechaza contraseñas cortas", () => {
    expect(evaluarPassword("Ab1!")).toContain("Debe tener al menos 12 caracteres.");
  });

  test("exige mayúscula, minúscula, número y símbolo", () => {
    expect(evaluarPassword("minusculas1234!")).toContain("Debe incluir una mayúscula.");
    expect(evaluarPassword("MAYUSCULAS1234!")).toContain("Debe incluir una minúscula.");
    expect(evaluarPassword("SinNumeroAqui!!")).toContain("Debe incluir un número.");
    expect(evaluarPassword("SinSimbolo12345")).toContain("Debe incluir un símbolo.");
  });

  test("un espacio no cuenta como símbolo", () => {
    expect(evaluarPassword("Con Espacios 1234")).toContain("Debe incluir un símbolo.");
  });

  test("reconoce mayúsculas y minúsculas con acentos y eñes", () => {
    expect(evaluarPassword("ñandú-ÑANDÚ-2026!")).toEqual([]);
  });

  test("rechaza lo que bcrypt truncaría (más de 72 bytes)", () => {
    expect(evaluarPassword("Aa1!" + "x".repeat(80))).toContain("No puede superar 72 caracteres.");
  });

  test("rechaza contraseñas que contienen el nombre de usuario del email", () => {
    expect(evaluarPassword("Maria.Lopez-2026!", { email: "maria.lopez@ejemplo.org" })).toContain("No debe contener tu nombre de usuario.");
    expect(evaluarPassword("Otra-Clave-Segura1!", { email: "maria.lopez@ejemplo.org" })).toEqual([]);
  });

  test("rechaza valores que no son texto", () => {
    expect(evaluarPassword(undefined)).toEqual(["La contraseña debe ser un texto."]);
    expect(evaluarPassword({ $ne: "" })).toEqual(["La contraseña debe ser un texto."]);
  });
});
