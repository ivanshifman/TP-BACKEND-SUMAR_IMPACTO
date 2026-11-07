import passport from "passport";
import ApiError from "../utils/ApiError.js";

export const autenticar = (req, res, next) => passport.authenticate("jwt", { session: false }, (error, user) => {
  if (error) return next(error);
  if (!user) {
    if (req.originalUrl.startsWith("/api")) return next(ApiError.unauthorized("Autenticación requerida."));
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  req.user = user;
  res.locals.usuarioActual = user;
  return next();
})(req, res, next);

export const permitirRoles = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (roles.includes(req.user.rol)) return next();
  return next(ApiError.forbidden("No tenés permisos para realizar esta acción."));
};

export const soloApi = (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next(ApiError.unauthorized("Token inválido o vencido."));
  return res.redirect("/login");
};
