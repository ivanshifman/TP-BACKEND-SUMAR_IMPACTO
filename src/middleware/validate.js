import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

export function validar(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const details = result.array().map(({ path, msg, location }) => ({ campo: path, mensaje: msg, ubicacion: location }));
    return next(ApiError.badRequest("Los datos enviados no superan las validaciones.", details));
  }
  next();
}
