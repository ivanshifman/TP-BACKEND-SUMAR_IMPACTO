import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

const VENTANA_MS = 15 * 60 * 1000;

const crearLimitador = ({ limit, mensaje, ...opciones }) => rateLimit({
  windowMs: VENTANA_MS,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooMany(mensaje)),
  ...opciones,
});

export const limitadorGeneral = crearLimitador({ limit: 300, mensaje: "Demasiadas solicitudes. Intentá más tarde." });

export const limitadorLogin = crearLimitador({ limit: 8, skipSuccessfulRequests: true, mensaje: "Demasiados intentos de acceso. Esperá 15 minutos." });

export const limitadorPassword = crearLimitador({ limit: 10, mensaje: "Demasiados intentos de cambio de contraseña. Esperá 15 minutos." });
