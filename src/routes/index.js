import express from "express";
import { body, param } from "express-validator";
import donantesRoutes from "./donantes.routes.js";
import organizacionesRoutes from "./organizaciones.routes.js";
import proyectosRoutes from "./proyectos.routes.js";
import donacionesRoutes from "./donaciones.routes.js";
import gastosRoutes from "./gastos.routes.js";
import { validar } from "../middleware/validate.js";
import { autenticar, permitirGrupo } from "../middleware/auth.js";
import { limitadorPassword } from "../middleware/rateLimiters.js";
import { ROLE_VALUES } from "../config/security.js";
import { validarEmail, validarPassword, validarConsultaAuditoria } from "../utils/validadores.js";
import * as admin from "../controllers/adminController.js";

const router = express.Router();
router.use(autenticar);
router.use("/donantes", donantesRoutes);
router.use("/organizaciones", organizacionesRoutes);
router.use("/proyectos", proyectosRoutes);
router.use("/donaciones", donacionesRoutes);
router.use("/gastos", gastosRoutes);

const camposDePerfil = [
  body("nombre").trim().isLength({ min: 2, max: 100 }),
  body("rol").isIn(ROLE_VALUES),
  body("organizacion").optional({ values: "falsy" }).isMongoId(),
];

router.get("/usuarios", permitirGrupo("ADMINISTRACION_SISTEMA"), admin.apiListarUsuarios);
router.post("/usuarios", permitirGrupo("ADMINISTRACION_SISTEMA"), [...camposDePerfil, validarEmail(), validarPassword(), validar], admin.apiCrearUsuario);
router.put("/usuarios/:id", permitirGrupo("ADMINISTRACION_SISTEMA"), [param("id").isMongoId(), ...camposDePerfil, validar], admin.apiActualizarUsuario);
router.patch("/usuarios/:id/estado", permitirGrupo("ADMINISTRACION_SISTEMA"), [param("id").isMongoId(), validar], admin.apiCambiarEstadoUsuario);
router.post("/usuarios/:id/password", permitirGrupo("ADMINISTRACION_SISTEMA"), limitadorPassword, [param("id").isMongoId(), validarPassword("passwordNueva"), validar], admin.apiResetearPassword);
router.get("/auditoria", permitirGrupo("CONSULTA_BITACORA"), [...validarConsultaAuditoria(), validar], admin.apiListarAuditoria);

export default router;
