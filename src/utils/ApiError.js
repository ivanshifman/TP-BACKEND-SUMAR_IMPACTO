export class ApiError extends Error {
  constructor(statusCode, message, details = null, code = null) {
    super(message); this.name = "ApiError"; this.statusCode = statusCode; this.details = details; this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
  static badRequest(message, details = null) { return new ApiError(400, message, details, "BAD_REQUEST"); }
  static unauthorized(message = "Autenticación requerida.") { return new ApiError(401, message, null, "UNAUTHORIZED"); }
  static forbidden(message = "No tenés permisos para esta acción.") { return new ApiError(403, message, null, "FORBIDDEN"); }
  static notFound(message) { return new ApiError(404, message, null, "NOT_FOUND"); }
  static conflict(message) { return new ApiError(409, message, null, "CONFLICT"); }
  static tooMany(message = "Demasiadas solicitudes. Intentá nuevamente más tarde.") { return new ApiError(429, message, null, "RATE_LIMITED"); }
}
export default ApiError;
