import express from "express";
import { body, param, query } from "express-validator";
import * as admin from "../controllers/adminController.js";
import { autenticar, permitirGrupo } from "../middleware/auth.js";
import { validar } from "../middleware/validate.js";
import { limitadorPassword } from "../middleware/rateLimiters.js";
import { ROLE_VALUES } from "../config/security.js";
import { validarEmail, validarPassword, validarMonto, validarConsultaAuditoria } from "../utils/validadores.js";

const router = express.Router();
router.use(autenticar);

const idValido = [param("id").isMongoId(), validar];

// ── Panel y usuarios ─────────────────────────────────────────────────────────────────────
const camposDePerfil = [
  body("nombre").trim().isLength({ min: 2, max: 100 }),
  body("rol").isIn(ROLE_VALUES),
  body("organizacion").optional({ values: "falsy" }).isMongoId(),
];

router.get("/admin", permitirGrupo("ADMINISTRACION_SISTEMA"), admin.dashboard);
router.get("/admin/usuarios", permitirGrupo("ADMINISTRACION_SISTEMA"), admin.listarUsuarios);
router.post("/admin/usuarios", permitirGrupo("ADMINISTRACION_SISTEMA"), [...camposDePerfil, validarEmail(), validarPassword(), validar], admin.crearUsuario);
router.get("/admin/usuarios/:id/editar", permitirGrupo("ADMINISTRACION_SISTEMA"), idValido, admin.formularioEditarUsuario);
router.put("/admin/usuarios/:id", permitirGrupo("ADMINISTRACION_SISTEMA"), [param("id").isMongoId(), ...camposDePerfil, validar], admin.actualizarUsuario);
router.post("/admin/usuarios/:id/estado", permitirGrupo("ADMINISTRACION_SISTEMA"), idValido, admin.cambiarEstadoUsuario);
router.post("/admin/usuarios/:id/password", permitirGrupo("ADMINISTRACION_SISTEMA"), limitadorPassword, [param("id").isMongoId(), validarPassword("passwordNueva"), validar], admin.resetearPassword);

// ── Bitácora de auditoría ────────────────────────────────────────────────────────────────
router.get("/admin/auditoria", permitirGrupo("CONSULTA_BITACORA"), [...validarConsultaAuditoria(), validar], admin.listarAuditoria);

// ── Campañas ─────────────────────────────────────────────────────────────────────────────
const camposDeCampania = [
  body("nombre").trim().isLength({ min: 3, max: 120 }),
  validarMonto("meta"),
  body("fechaInicio").isISO8601(),
  body("fechaFin").isISO8601().bail()
    .custom((fin, { req }) => new Date(fin) >= new Date(req.body.fechaInicio)).withMessage("La fecha de fin no puede ser anterior a la de inicio."),
  validar,
];

router.get("/admin/campanias", permitirGrupo("LECTURA_CAMPANIAS"), admin.listarCampanias);
router.get("/admin/campanias/nueva", permitirGrupo("GESTION_CAMPANIAS"), admin.formularioNuevaCampania);
router.get("/admin/campanias/:id/editar", permitirGrupo("GESTION_CAMPANIAS"), idValido, admin.formularioEditarCampania);
router.post("/admin/campanias", permitirGrupo("GESTION_CAMPANIAS"), camposDeCampania, admin.crearCampania);
router.put("/admin/campanias/:id", permitirGrupo("GESTION_CAMPANIAS"), [param("id").isMongoId(), ...camposDeCampania], admin.actualizarCampania);
router.post("/admin/campanias/:id/estado", permitirGrupo("GESTION_CAMPANIAS"), idValido, admin.cambiarEstadoCampania);
router.get("/admin/campanias/:id/reporte.pdf", permitirGrupo("LECTURA_CAMPANIAS"), idValido, admin.exportarReporteCampaniaPdf);
router.get("/admin/campanias/:id/reporte", permitirGrupo("LECTURA_CAMPANIAS"), idValido, admin.reporteCampania);

// ── Rendiciones ──────────────────────────────────────────────────────────────────────────
router.get("/rendiciones", permitirGrupo("LECTURA_RENDICIONES"), [query("estado").optional().isIn(["recibido", "en_revision", "pendiente_mesa", "aprobado", "observado"]), validar], admin.listarRendiciones);
router.post("/rendiciones/:id/revision", permitirGrupo("REVISION_RENDICIONES"), [param("id").isMongoId(), body("accion").isIn(["aprobar", "observar"]), body("observacion").optional().isLength({ max: 1000 }), validar], admin.revisarRendicion);
router.get("/rendiciones/:id/comprobante", permitirGrupo("LECTURA_RENDICIONES"), admin.descargarComprobante);

export default router;
