const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(ApiError.notFound(`La ruta ${req.method} ${req.originalUrl} no existe.`));
}

module.exports = notFound;
