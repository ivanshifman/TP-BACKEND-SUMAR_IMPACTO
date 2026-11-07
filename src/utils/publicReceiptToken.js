import jwt from "jsonwebtoken";
import { getRequiredEnv } from "../config/security.js";
export function crearTokenComprobante(gastoId) {
  return jwt.sign({ type: "receipt" }, getRequiredEnv("COMPROBANTE_LINK_SECRET"), { subject: String(gastoId), expiresIn: "90d", issuer: process.env.JWT_ISSUER || "sumarimpacto-api", audience: "sumarimpacto-donantes", algorithm: "HS256" });
}
export function verificarTokenComprobante(token) {
  const payload = jwt.verify(token, getRequiredEnv("COMPROBANTE_LINK_SECRET"), { issuer: process.env.JWT_ISSUER || "sumarimpacto-api", audience: "sumarimpacto-donantes", algorithms: ["HS256"] });
  if (payload.type !== "receipt") throw new Error("Token de comprobante no válido.");
  return payload.sub;
}
