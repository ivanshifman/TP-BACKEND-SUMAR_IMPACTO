import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL, getRequiredEnv } from "../config/security.js";

const issuer = () => process.env.JWT_ISSUER || "sumarimpacto-api";
const audience = () => process.env.JWT_AUDIENCE || "sumarimpacto-client";

export function firmarAccessToken(user) {
  return jwt.sign({ rol: user.rol, organizacion: user.organizacion ? String(user.organizacion) : null }, getRequiredEnv("JWT_ACCESS_SECRET"), {
    subject: String(user._id), expiresIn: ACCESS_TOKEN_TTL, issuer: issuer(), audience: audience(), algorithm: "HS256",
  });
}

export function firmarRefreshToken(user) {
  return jwt.sign({ type: "refresh", jti: crypto.randomUUID() }, getRequiredEnv("JWT_REFRESH_SECRET"), {
    subject: String(user._id), expiresIn: REFRESH_TOKEN_TTL, issuer: issuer(), audience: audience(), algorithm: "HS256",
  });
}

export function verificarRefreshToken(token) {
  return jwt.verify(token, getRequiredEnv("JWT_REFRESH_SECRET"), { issuer: issuer(), audience: audience(), algorithms: ["HS256"] });
}

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
export const compararHashToken = (token, hashGuardado) => {
  if (!hashGuardado) return false;
  const actual = Buffer.from(hashToken(token), "hex");
  const esperado = Buffer.from(hashGuardado, "hex");
  return actual.length === esperado.length && crypto.timingSafeEqual(actual, esperado);
};
export const cookieOptions = (maxAge) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge });
export const ACCESS_COOKIE_MS = 15 * 60 * 1000;
export const REFRESH_COOKIE_MS = 7 * 24 * 60 * 60 * 1000;
