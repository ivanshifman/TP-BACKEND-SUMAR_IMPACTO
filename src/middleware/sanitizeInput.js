import ApiError from "../utils/ApiError.js";

const PROFUNDIDAD_MAXIMA = 6;

function esEstructuraPeligrosa(valor, profundidad = 0) {
  if (profundidad > PROFUNDIDAD_MAXIMA) return true;
  if (Array.isArray(valor)) return valor.some((elemento) => esEstructuraPeligrosa(elemento, profundidad + 1));
  if (valor && typeof valor === "object") {
    return Object.keys(valor).some((clave) => clave.startsWith("$") || clave.includes(".") || esEstructuraPeligrosa(valor[clave], profundidad + 1));
  }
  return false;
}

export function rechazarOperadoresMongo(req, _res, next) {
  if ([req.body, req.query, req.params].some((origen) => esEstructuraPeligrosa(origen))) {
    return next(ApiError.badRequest("La solicitud contiene claves o una estructura no permitidas."));
  }
  return next();
}

export { esEstructuraPeligrosa };
