import ApiError from "../utils/ApiError.js";

export function notFound(req, res, next) {
  next(ApiError.notFound(`La ruta ${req.method} ${req.originalUrl} no existe.`));
}

export default notFound;
