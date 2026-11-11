import { ROLES } from "./security.js";

const { ADMIN, REFERENTE, AUDITORIA, MESA, TRABAJO_SOCIAL, ADMINISTRACION } = ROLES;

export const GRUPOS = Object.freeze({
  LECTURA_FINANCIERA: Object.freeze([ADMIN, ADMINISTRACION, AUDITORIA, MESA]),
  GESTION_FINANCIERA: Object.freeze([ADMIN, ADMINISTRACION]),
  BAJA_REGISTROS: Object.freeze([ADMIN]),
  LECTURA_ORGANIZACIONES: Object.freeze([ADMIN, TRABAJO_SOCIAL, MESA, AUDITORIA, ADMINISTRACION]),
  GESTION_ORGANIZACIONES: Object.freeze([ADMIN, TRABAJO_SOCIAL]),
  GESTION_PROYECTOS: Object.freeze([ADMIN, MESA, TRABAJO_SOCIAL]),
  BAJA_PROYECTOS: Object.freeze([ADMIN, MESA]),
  LECTURA_RENDICIONES: Object.freeze([ADMIN, REFERENTE, AUDITORIA, MESA, ADMINISTRACION]),
  CARGA_RENDICIONES: Object.freeze([REFERENTE]),
  REVISION_RENDICIONES: Object.freeze([AUDITORIA, MESA]),
  GESTION_CAMPANIAS: Object.freeze([ADMIN, MESA]),
  LECTURA_CAMPANIAS: Object.freeze([ADMIN, MESA, ADMINISTRACION]),
  ADMINISTRACION_SISTEMA: Object.freeze([ADMIN]),
  CONSULTA_BITACORA: Object.freeze([ADMIN, AUDITORIA]),
});

export function rolesDelGrupo(nombre) {
  const roles = GRUPOS[nombre];
  if (!roles) throw new Error(`Grupo de permisos inexistente: ${nombre}`);
  return roles;
}

export const puedeRol = (nombreGrupo, rol) => rolesDelGrupo(nombreGrupo).includes(rol);
