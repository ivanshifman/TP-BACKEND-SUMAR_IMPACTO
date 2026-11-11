import express from "express";
import { body, param } from "express-validator";
import * as controlador from "../controllers/viewsController.js";
import * as auth from "../controllers/authController.js";
import { autenticar, permitirGrupo } from "../middleware/auth.js";
import { uploadComprobante } from "../middleware/upload.js";
import { validar } from "../middleware/validate.js";
import { limitadorLogin, limitadorPassword } from "../middleware/rateLimiters.js";
import { validarEmail, validarMonto, validarFechaNoFutura, validarPassword } from "../utils/validadores.js";

const router = express.Router();
const idValido = [param("id").isMongoId(), validar];

router.get("/login", auth.formularioLogin);
router.post("/login", limitadorLogin, auth.login);
router.post("/logout", auth.logout);

router.use(autenticar);

router.get("/", controlador.inicio);
router.get("/tutorial", (_req, res) => res.render("tutorial", { titulo: "Guía de uso | SumarImpacto" }));
router.get("/perfil/password", auth.formularioPassword);
router.post("/perfil/password", limitadorPassword, [body("passwordActual").isString().notEmpty(), validarPassword("passwordNueva"), validar], auth.cambiarPasswordWeb);

// ── Proyectos ────────────────────────────────────────────────────────────────────────────
const camposDeProyecto = [
  body("nombre").trim().isLength({ min: 2, max: 120 }),
  body("organizacion").isMongoId(),
  validarMonto("presupuestoTotal"),
  body("periodoInicio").isISO8601(),
  body("periodoFin").isISO8601().bail()
    .custom((fin, { req }) => new Date(fin) >= new Date(req.body.periodoInicio)).withMessage("El período de fin no puede ser anterior al de inicio."),
  body("rubros").isString().isLength({ min: 2 }),
  validar,
];

router.get("/proyectos/nuevo", permitirGrupo("GESTION_PROYECTOS"), controlador.mostrarFormularioNuevoProyecto);
router.post("/proyectos", permitirGrupo("GESTION_PROYECTOS"), camposDeProyecto, controlador.crearProyectoDesdeFormulario);
router.get("/proyectos/:id/editar", permitirGrupo("GESTION_PROYECTOS"), idValido, controlador.mostrarFormularioEditarProyecto);
router.put("/proyectos/:id", permitirGrupo("GESTION_PROYECTOS"), [param("id").isMongoId(), ...camposDeProyecto], controlador.actualizarProyectoDesdeFormulario);
router.post("/proyectos/:id/estado", permitirGrupo("GESTION_PROYECTOS"), [param("id").isMongoId(), body("activo").isIn(["true", "false"]), validar], controlador.cambiarEstadoProyectoDesdeFormulario);
router.delete("/proyectos/:id", permitirGrupo("BAJA_PROYECTOS"), idValido, controlador.eliminarProyectoDesdeFormulario);
router.get("/proyectos/:id", controlador.detalleProyecto);

// ── Donantes ─────────────────────────────────────────────────────────────────────────────
const camposDeDonante = [body("nombre").trim().isLength({ min: 2, max: 120 }), validarEmail(), body("tipo").isIn(["individual", "corporativo"]), validar];

router.get("/donantes", permitirGrupo("LECTURA_FINANCIERA"), controlador.listarDonantes);
router.get("/donantes/nuevo", permitirGrupo("GESTION_FINANCIERA"), controlador.mostrarFormularioNuevoDonante);
router.post("/donantes", permitirGrupo("GESTION_FINANCIERA"), camposDeDonante, controlador.crearDonanteDesdeFormulario);
router.get("/donantes/:id/editar", permitirGrupo("GESTION_FINANCIERA"), idValido, controlador.mostrarFormularioEditarDonante);
router.put("/donantes/:id", permitirGrupo("GESTION_FINANCIERA"), [param("id").isMongoId(), ...camposDeDonante], controlador.actualizarDonanteDesdeFormulario);
router.delete("/donantes/:id", permitirGrupo("BAJA_REGISTROS"), idValido, controlador.eliminarDonanteDesdeFormulario);
router.get("/donantes/:id", permitirGrupo("LECTURA_FINANCIERA"), controlador.detalleDonante);

// ── Organizaciones ───────────────────────────────────────────────────────────────────────
const camposDeOrganizacion = [body("nombre").trim().isLength({ min: 2, max: 120 }), body("descripcion").trim().isLength({ min: 10, max: 1000 }), validar];

router.get("/organizaciones", permitirGrupo("LECTURA_ORGANIZACIONES"), controlador.listarOrganizaciones);
router.get("/organizaciones/nuevo", permitirGrupo("GESTION_ORGANIZACIONES"), controlador.mostrarFormularioNuevaOrganizacion);
router.post("/organizaciones", permitirGrupo("GESTION_ORGANIZACIONES"), camposDeOrganizacion, controlador.crearOrganizacionDesdeFormulario);
router.get("/organizaciones/:id/editar", permitirGrupo("GESTION_ORGANIZACIONES"), idValido, controlador.mostrarFormularioEditarOrganizacion);
router.put("/organizaciones/:id", permitirGrupo("GESTION_ORGANIZACIONES"), [param("id").isMongoId(), ...camposDeOrganizacion], controlador.actualizarOrganizacionDesdeFormulario);
router.delete("/organizaciones/:id", permitirGrupo("BAJA_REGISTROS"), idValido, controlador.eliminarOrganizacionDesdeFormulario);
router.get("/organizaciones/:id", permitirGrupo("LECTURA_ORGANIZACIONES"), controlador.detalleOrganizacion);

// ── Donaciones ───────────────────────────────────────────────────────────────────────────
const camposDeDonacion = [
  body("donante").isMongoId(),
  body("proyecto").optional({ values: "falsy" }).isMongoId(),
  body("campania").optional({ values: "falsy" }).isMongoId(),
  validarMonto("monto"),
  validarFechaNoFutura("fecha", { opcional: true }),
  validar,
];

router.get("/donaciones/nueva", permitirGrupo("GESTION_FINANCIERA"), controlador.mostrarFormularioNuevaDonacion);
router.post("/donaciones", permitirGrupo("GESTION_FINANCIERA"), camposDeDonacion, controlador.crearDonacionDesdeFormulario);
router.get("/donaciones/:id/editar", permitirGrupo("GESTION_FINANCIERA"), idValido, controlador.mostrarFormularioEditarDonacion);
router.put("/donaciones/:id", permitirGrupo("GESTION_FINANCIERA"), [param("id").isMongoId(), ...camposDeDonacion], controlador.actualizarDonacionDesdeFormulario);
router.delete("/donaciones/:id", permitirGrupo("BAJA_REGISTROS"), idValido, controlador.eliminarDonacionDesdeFormulario);

// ── Gastos ───────────────────────────────────────────────────────────────────────────────
router.get("/gastos", permitirGrupo("LECTURA_RENDICIONES"), controlador.listarGastos);
router.get("/gastos/nuevo", permitirGrupo("CARGA_RENDICIONES"), controlador.mostrarFormularioNuevoGasto);
router.post("/gastos", permitirGrupo("CARGA_RENDICIONES"), uploadComprobante, [
  body("proyecto").isMongoId(),
  validarMonto("monto"),
  validarFechaNoFutura("fecha"),
  body("rubro").trim().isLength({ min: 2, max: 80 }),
  body("descripcion").trim().isLength({ min: 3, max: 500 }),
  validar,
], controlador.crearGastoDesdeFormulario);

export default router;
