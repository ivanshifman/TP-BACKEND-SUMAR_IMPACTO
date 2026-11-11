const numero = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0 || value > 100) throw new Error(`${name} debe ser un porcentaje mayor a 0 y hasta 100.`);
  return value;
};

export const UMBRAL_AUTO_APROBACION_PCT = numero("RENDICION_AUTO_MAX_PCT", 5);
export const UMBRAL_MESA_COORDINADORA_PCT = numero("RENDICION_MESA_MIN_PCT", 30);
export const TOPE_MENSUAL_AUTO_PCT = numero("RENDICION_AUTO_MONTHLY_CAP_PCT", 5);

if (UMBRAL_AUTO_APROBACION_PCT > UMBRAL_MESA_COORDINADORA_PCT) {
  throw new Error("RENDICION_AUTO_MAX_PCT no puede superar RENDICION_MESA_MIN_PCT.");
}
