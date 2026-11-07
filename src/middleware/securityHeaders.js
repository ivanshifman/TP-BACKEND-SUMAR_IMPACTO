
import ApiError from "../utils/ApiError.js";

export function originProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("origin");

  if (!origin) {
    return next();
  }

  let parsedOrigin;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    return next(
      ApiError.forbidden("El origen de la solicitud no es válido.")
    );
  }

  if (req.originalUrl.startsWith("/api")) {
    const allowedOrigins = (
      process.env.CORS_ORIGINS || "http://localhost:3000"
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!allowedOrigins.includes(origin)) {
      return next(
        ApiError.forbidden("El origen de la solicitud no está autorizado.")
      );
    }

    return next();
  }

  const allowedWebOrigins = [
    `http://${req.get("host")}`,
    `https://${req.get("host")}`,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  if (!allowedWebOrigins.includes(origin)) {
    return next(
      ApiError.forbidden("El origen de la solicitud no está autorizado.")
    );
  }

  return next();
}

export default originProtection;
