import passport from "passport";
import Usuario from "../models/Usuario.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { firmarAccessToken, firmarRefreshToken, verificarRefreshToken, hashToken, cookieOptions, ACCESS_COOKIE_MS, REFRESH_COOKIE_MS, compararHashToken } from "../utils/token.js";

const emitirTokens = async (user, res) => {
  const access = firmarAccessToken(user);
  const refresh = firmarRefreshToken(user);
  user.refreshTokenHash = hashToken(refresh);
  user.ultimoAcceso = new Date();
  await user.save();
  res.cookie("access_token", access, cookieOptions(ACCESS_COOKIE_MS));
  res.cookie("refresh_token", refresh, cookieOptions(REFRESH_COOKIE_MS));
  return { accessToken: access, refreshToken: refresh };
};

export const formularioLogin = (req, res) => res.render("auth/login", { titulo: "Ingresar | SumarImpacto", error: null, next: req.query.next || "/" });

export const login = (req, res, next) => passport.authenticate("local", { session: false }, async (error, user, info) => {
  if (error) return next(error);
  if (!user) {
    if (req.originalUrl.startsWith("/api")) return res.status(401).json({ error: true, mensaje: info?.message || "Credenciales inválidas." });
    return res.status(401).render("auth/login", { titulo: "Ingresar | SumarImpacto", error: info?.message || "Credenciales inválidas.", next: req.body.next || "/" });
  }
  try {
    const tokens = await emitirTokens(user, res);
    if (req.originalUrl.startsWith("/api")) return res.json({ usuario: user.toJSON(), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: "Bearer", expiresIn: process.env.JWT_ACCESS_TTL || "15m" });
    const nextUrl = typeof req.body.next === "string" && req.body.next.startsWith("/") && !(req.body.next.startsWith("//") || req.body.next.includes("\\") || req.body.next.includes("://")) ? req.body.next : "/";
    return res.redirect(nextUrl);
  } catch (err) { return next(err); }
})(req, res, next);

export const refresh = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refresh_token;
  if (!token) throw ApiError.unauthorized("No se recibió refresh token.");
  let payload;
  try { payload = verificarRefreshToken(token); } catch { throw ApiError.unauthorized("Refresh token inválido o vencido."); }
  const user = await Usuario.findById(payload.sub).select("+refreshTokenHash");
  if (payload.type !== "refresh" || !user || !user.activo || !user.refreshTokenHash || !compararHashToken(token, user.refreshTokenHash)) throw ApiError.unauthorized("La sesión ya no es válida. Volvé a ingresar.");
  const tokens = await emitirTokens(user, res);
  res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: "Bearer" });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refresh_token;
  if (token) {
    try {
      const payload = verificarRefreshToken(token);
      await Usuario.findByIdAndUpdate(payload.sub, { $set: { refreshTokenHash: null } });
    } catch { /* Token vencido: igualmente se limpian las cookies. */ }
  }
  res.clearCookie("access_token", cookieOptions(0));
  res.clearCookie("refresh_token", cookieOptions(0));
  if (req.originalUrl.startsWith("/api")) return res.status(204).send();
  res.redirect("/login");
});

export const perfil = asyncHandler(async (req, res) => res.json({ usuario: req.user }));
