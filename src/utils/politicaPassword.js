import { LIMITES } from "../config/validacion.js";

export const MENSAJE_POLITICA_PASSWORD =
  `La contraseña debe tener entre ${LIMITES.PASSWORD_MIN} y ${LIMITES.PASSWORD_MAX_BYTES} caracteres ` +
  "e incluir mayúscula, minúscula, número y símbolo.";

/**
 * Evalúa una contraseña contra la política del sistema.
 * Devuelve la lista de incumplimientos (vacía si la contraseña es válida).
 * Es una función pura: la usan las rutas, los servicios y los scripts.
 */
export function evaluarPassword(password, { email } = {}) {
  if (typeof password !== "string") return ["La contraseña debe ser un texto."];
  const problemas = [];
  if (password.length < LIMITES.PASSWORD_MIN) problemas.push(`Debe tener al menos ${LIMITES.PASSWORD_MIN} caracteres.`);
  if (Buffer.byteLength(password, "utf8") > LIMITES.PASSWORD_MAX_BYTES) problemas.push(`No puede superar ${LIMITES.PASSWORD_MAX_BYTES} caracteres.`);
  if (!/\p{Lu}/u.test(password)) problemas.push("Debe incluir una mayúscula.");
  if (!/\p{Ll}/u.test(password)) problemas.push("Debe incluir una minúscula.");
  if (!/\p{Nd}/u.test(password)) problemas.push("Debe incluir un número.");
  if (!/[^\p{L}\p{N}\s]/u.test(password)) problemas.push("Debe incluir un símbolo.");
  if (email) {
    const usuario = String(email).split("@")[0].toLowerCase();
    if (usuario.length >= 4 && password.toLowerCase().includes(usuario)) problemas.push("No debe contener tu nombre de usuario.");
  }
  return problemas;
}

export const esPasswordValida = (password, opciones) => evaluarPassword(password, opciones).length === 0;
