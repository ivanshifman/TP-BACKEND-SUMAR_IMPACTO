// Límites de validación compartidos por rutas, servicios y scripts.
export const LIMITES = Object.freeze({
  PASSWORD_MIN: 12,
  PASSWORD_MAX_BYTES: 72,
  MONTO_MAXIMO: 1_000_000_000,
  TOLERANCIA_FECHA_FUTURA_MS: 24 * 60 * 60 * 1000,
});
