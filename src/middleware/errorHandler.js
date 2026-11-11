import ApiError from "../utils/ApiError.js";

function normalizarError(err) {
  if (err instanceof ApiError) return err;
  if (err instanceof SyntaxError && "body" in err) return ApiError.badRequest("El JSON enviado no tiene un formato válido.");
  if (err?.status === 413) return new ApiError(413, "El contenido enviado supera el tamaño permitido.", null, "PAYLOAD_TOO_LARGE");
  if (err?.status === 403) return ApiError.forbidden("El origen de la solicitud no está autorizado.");
  if (err?.name === "CastError") return ApiError.badRequest("Uno de los identificadores enviados no tiene un formato válido.");
  if (err?.name === "ValidationError") return ApiError.badRequest("Los datos enviados no son válidos.", Object.values(err.errors).map((e) => ({ campo: e.path, mensaje: e.message })));
  if (err?.name === "VersionError") return ApiError.conflict("El registro fue modificado por otra persona mientras lo editabas. Recargá e intentá de nuevo.");
  if (err?.code === 11000) return ApiError.conflict("Ya existe un registro con ese dato único.");
  if (err?.name === "TokenExpiredError" || err?.name === "JsonWebTokenError") return ApiError.unauthorized("Token inválido o vencido.");
  if (err?.name === "MulterError") return ApiError.badRequest(err.code === "LIMIT_FILE_SIZE" ? "El archivo supera el máximo permitido de 5 MB." : "No se pudo procesar el archivo adjunto.");
  return null;
}

export function errorHandler(err, req, res, _next) {
  const normalized = normalizarError(err);
  const known = normalized instanceof ApiError;
  const statusCode = known ? normalized.statusCode : 500;
  const mensaje = known ? normalized.message : "Ocurrió un error interno. El equipo técnico fue notificado.";
  if (!known || statusCode >= 500) console.error({ message: err.message, stack: err.stack, path: req.originalUrl, method: req.method });
  if (req.originalUrl.startsWith("/api")) return res.status(statusCode).json({ error: true, codigo: known ? normalized.code : "INTERNAL_ERROR", mensaje, ...(known && normalized.details ? { detalles: normalized.details } : {}), ...(process.env.NODE_ENV !== "production" && !known ? { debug: err.message } : {}) });
  
  const motivos = known && Array.isArray(normalized.details) ? normalized.details.map((detalle) => detalle.mensaje).filter(Boolean) : [];
  if (req.accepts("html")) return res.status(statusCode).render("error", { titulo: "Error | SumarImpacto", statusCode, mensaje: [mensaje, ...motivos].join(" ") });
  return res.status(statusCode).json({ error: true, mensaje });
}
export default errorHandler;
