import ApiError from "../utils/ApiError.js";

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

export const listaDeOrigenes = (valor, porDefecto) => (valor || porDefecto).split(",").map((item) => item.trim()).filter(Boolean);

export function originProtection(req, _res, next) {
  if (METODOS_SEGUROS.has(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next();

  try {
    new URL(origin);
  } catch {
    return next(ApiError.forbidden("El origen de la solicitud no es válido."));
  }

  const host = req.get("host");
  const propios = [`http://${host}`, `https://${host}`];
  const adicionales = req.originalUrl.startsWith("/api")
    ? listaDeOrigenes(process.env.CORS_ORIGINS, "http://localhost:3000")
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

  if (![...propios, ...adicionales].includes(origin)) return next(ApiError.forbidden("El origen de la solicitud no está autorizado."));
  return next();
}

export function sinCache(_req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
}

export const directivasCSP = () => ({
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'"],
  styleSrcAttr: ["'unsafe-inline'"],
  imgSrc: ["'self'", "data:"],
  fontSrc: ["'self'"],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  "upgrade-insecure-requests": process.env.NODE_ENV === "production" ? [] : null,
});

export default originProtection;
