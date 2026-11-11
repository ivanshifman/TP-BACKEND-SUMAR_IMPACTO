import passport from "passport";
import ApiError from "../utils/ApiError.js";
import { puedeRol, rolesDelGrupo } from "../config/permisos.js";

const RUTAS_CON_CAMBIO_PENDIENTE = new Set(["/perfil/password", "/logout", "/api/auth/password", "/api/auth/me", "/api/auth/logout"]);

const esApi = (req) => req.originalUrl.startsWith("/api");
const rutaSinQuery = (req) => req.originalUrl.split("?")[0];

export const autenticar = (req, res, next) => passport.authenticate("jwt", { session: false }, (error, user) => {
  if (error) return next(error);
  if (!user) {
    if (esApi(req)) return next(ApiError.unauthorized("Autenticación requerida."));
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  req.user = user;
  res.locals.usuarioActual = user;
  res.locals.puede = (grupo) => puedeRol(grupo, user.rol);
  if (user.debeCambiarPassword && !RUTAS_CON_CAMBIO_PENDIENTE.has(rutaSinQuery(req))) {
    if (esApi(req)) return next(new ApiError(403, "Debés cambiar tu contraseña antes de continuar.", null, "PASSWORD_CHANGE_REQUIRED"));
    return res.redirect("/perfil/password");
  }
  return next();
})(req, res, next);

export const permitirRoles = (...roles) => {
  const middleware = (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.includes(req.user.rol)) return next();
    return next(ApiError.forbidden("No tenés permisos para realizar esta acción."));
  };
  middleware.roles = Object.freeze([...roles]);
  return middleware;
};

export const permitirGrupo = (nombre) => permitirRoles(...rolesDelGrupo(nombre));

export const soloApi = (req, res, next) => {
  if (esApi(req)) return next(ApiError.unauthorized("Token inválido o vencido."));
  return res.redirect("/login");
};
