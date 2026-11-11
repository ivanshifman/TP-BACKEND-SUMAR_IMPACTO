import { LIMITES } from "../config/validacion.js";

/** Marca de tiempo (ms) del inicio del día UTC de una fecha. */
export const diaUTC = (fecha) => {
  const f = new Date(fecha);
  return Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
};

/** `true` si la fecha es posterior a ahora, descontando la tolerancia de zona horaria. */
export function esFechaFutura(valor, ahora = Date.now(), tolerancia = LIMITES.TOLERANCIA_FECHA_FUTURA_MS) {
  const marca = new Date(valor).getTime();
  return Number.isFinite(marca) && marca > ahora + tolerancia;
}
