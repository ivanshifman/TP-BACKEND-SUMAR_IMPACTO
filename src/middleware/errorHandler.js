const ApiError = require("../utils/ApiError");
const httpStatus = require("../utils/httpStatus");

function errorHandler(err, req, res, next) {
  const esApiError = err instanceof ApiError;
  const statusCode = esApiError ? err.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
  const mensaje = esApiError ? err.message : "Ocurrió un error interno en el servidor.";

  if (!esApiError) {
    console.error(err);
  }

  if (req.originalUrl.startsWith("/api")) {
    return res.status(statusCode).json({
      error: true,
      mensaje,
      ...(esApiError && err.details ? { detalles: err.details } : {}),
    });
  }

  return res.status(statusCode).render("error", {
    titulo: "Error",
    statusCode,
    mensaje,
  });
}

module.exports = errorHandler;
