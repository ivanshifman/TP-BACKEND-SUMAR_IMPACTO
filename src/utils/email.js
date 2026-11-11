/**
 * Normaliza un email para guardarlo y compararlo: recorta espacios y pasa a minúsculas.
 * No aplica reglas específicas de cada proveedor (p. ej. quitar los puntos de Gmail),
 * porque alterarían la dirección que la persona realmente usa para ingresar.
 */
export const normalizarEmail = (valor) => String(valor ?? "").trim().toLowerCase();
