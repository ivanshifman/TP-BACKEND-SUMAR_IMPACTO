import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcryptjs";
import Usuario from "../models/Usuario.js";
import { getRequiredEnv } from "./security.js";
import { normalizarEmail } from "../utils/email.js";

const cookieExtractor = (req) => {
  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (req?.originalUrl?.startsWith("/api")) return bearer || req?.cookies?.access_token || null;
  return req?.cookies?.access_token || bearer || null;
};

const HASH_DE_RELLENO = bcrypt.hashSync("relleno-para-igualar-tiempos-de-respuesta", 12);

passport.use("local", new LocalStrategy({ usernameField: "email", passwordField: "password", session: false }, async (email, password, done) => {
  try {
    const user = await Usuario.findOne({ email: normalizarEmail(email), activo: true }).select("+password");
    const coincide = await bcrypt.compare(String(password ?? ""), user?.password ?? HASH_DE_RELLENO);
    if (!user || !coincide) return done(null, false, { message: "Credenciales inválidas." });
    return done(null, user);
  } catch (error) { return done(error); }
}));

passport.use("jwt", new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
  secretOrKeyProvider: (_req, _rawJwt, done) => {
    try { return done(null, getRequiredEnv("JWT_ACCESS_SECRET")); } catch (error) { return done(error); }
  },
  issuer: process.env.JWT_ISSUER || "sumarimpacto-api",
  audience: process.env.JWT_AUDIENCE || "sumarimpacto-client",
  algorithms: ["HS256"],
}, async (payload, done) => {
  try {
    const user = await Usuario.findOne({ _id: payload.sub, activo: true }).select("nombre email rol organizacion activo debeCambiarPassword");
    return user ? done(null, user) : done(null, false);
  } catch (error) { return done(error, false); }
}));

export default passport;
