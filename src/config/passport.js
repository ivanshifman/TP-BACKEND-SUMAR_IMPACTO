import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcryptjs";
import Usuario from "../models/Usuario.js";

const cookieExtractor = (req) => {
  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (req?.originalUrl?.startsWith("/api")) return bearer || req?.cookies?.access_token || null;
  return req?.cookies?.access_token || bearer || null;
};
const secret = process.env.JWT_ACCESS_SECRET || "local-development-secret-change-before-deploy";
passport.use("local", new LocalStrategy({ usernameField: "email", passwordField: "password", session: false }, async (email, password, done) => {
  try {
    const user = await Usuario.findOne({ email: String(email).toLowerCase().trim(), activo: true }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) return done(null, false, { message: "Credenciales inválidas." });
    return done(null, user);
  } catch (error) { return done(error); }
}));
passport.use("jwt", new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
  secretOrKey: secret, issuer: process.env.JWT_ISSUER || "sumarimpacto-api", audience: process.env.JWT_AUDIENCE || "sumarimpacto-client", algorithms: ["HS256"],
}, async (payload, done) => {
  try {
    const user = await Usuario.findOne({ _id: payload.sub, activo: true }).select("nombre email rol organizacion activo");
    return user ? done(null, user) : done(null, false);
  } catch (error) { return done(error, false); }
}));
export default passport;
