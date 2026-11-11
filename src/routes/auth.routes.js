import express from "express";
import { body } from "express-validator";
import * as auth from "../controllers/authController.js";
import { validar } from "../middleware/validate.js";
import { autenticar } from "../middleware/auth.js";
import { limitadorLogin, limitadorPassword } from "../middleware/rateLimiters.js";
import { validarPassword } from "../utils/validadores.js";

const router = express.Router();

router.post("/api/auth/login", limitadorLogin, [body("email").isEmail(), body("password").isString().notEmpty(), validar], auth.login);
router.post("/api/auth/refresh", auth.refresh);
router.post("/api/auth/logout", auth.logout);
router.get("/api/auth/me", autenticar, auth.perfil);
router.post("/api/auth/password", autenticar, limitadorPassword, [body("passwordActual").isString().notEmpty(), validarPassword("passwordNueva"), validar], auth.cambiarPassword);

export default router;
