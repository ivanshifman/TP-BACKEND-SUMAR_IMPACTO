export const ROLES = Object.freeze({
  ADMIN: "administrador",
  REFERENTE: "referente_territorial",
  AUDITORIA: "auditoria",
  MESA: "mesa_coordinadora",
  TRABAJO_SOCIAL: "trabajo_social",
  ADMINISTRACION: "administracion",
});

export const ROLE_LABELS = Object.freeze({
  administrador: "Administrador del sistema",
  referente_territorial: "Referente territorial",
  auditoria: "Auditoría",
  mesa_coordinadora: "Mesa Coordinadora",
  trabajo_social: "Trabajo Social",
  administracion: "Administración",
});

export const ROLE_VALUES = Object.values(ROLES);

export const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || "15m";
export const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || "7d";

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta configurar la variable de entorno ${name}.`);
  return value;
}
