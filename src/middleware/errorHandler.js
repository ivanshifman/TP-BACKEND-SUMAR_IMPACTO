import ApiError from "../utils/ApiError.js";
import httpStatus from "../utils/httpStatus.js";

function traducirErrorDeMongoose(err) {
  if (err.name === "CastError") {
    return ApiError.badRequest(`El valor '${err.value}' no es un id válido.`);
  }

  if (err.name === "ValidationError") {
    const detalles = Object.values(err.errors).map((e) => e.message);
    return ApiError.badRequest("Los datos enviados no son válidos.", detalles);
  }

  if (err.code === 11000) {
    return ApiError.conflict("Ya existe un registro con ese valor único.");
  }

  return err;
}

export function errorHandler(err, req, res, next) {
  const error = err instanceof ApiError ? err : traducirErrorDeMongoose(err);
  const esApiError = error instanceof ApiError;
  const statusCode = esApiError ? error.statusCode : httpStatus.INTERNAL_SERVER_ERROR;
  const mensaje = esApiError ? error.message : "Ocurrió un error interno en el servidor.";

  if (!esApiError) {
    console.error(err);
  }

  if (req.originalUrl.startsWith("/api")) {
    return res.status(statusCode).json({
      error: true,
      mensaje,
      ...(esApiError && error.details ? { detalles: error.details } : {}),
    });
  }

  return res.status(statusCode).render("error", {
    titulo: "Error",
    statusCode,
    mensaje,
  });
}

export default errorHandler;
