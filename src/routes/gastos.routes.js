import express from "express";
import { body, param, query } from "express-validator";
import * as controlador from "../controllers/gastosController.js";
import { permitirGrupo } from "../middleware/auth.js";
import { validar } from "../middleware/validate.js";
import { uploadComprobante } from "../middleware/upload.js";
import { validarMonto, validarFechaNoFutura } from "../utils/validadores.js";

const router = express.Router();
const ESTADOS = ["recibido", "en_revision", "pendiente_mesa", "aprobado", "observado"];

router.get("/", permitirGrupo("LECTURA_RENDICIONES"), [query("proyectoId").optional().isMongoId(), query("estado").optional().isIn(ESTADOS), validar], controlador.listar);
router.get("/:id", permitirGrupo("LECTURA_RENDICIONES"), [param("id").isMongoId(), validar], controlador.obtenerPorId);
router.post("/", permitirGrupo("CARGA_RENDICIONES"), uploadComprobante, [
  body("proyecto").isMongoId(),
  validarMonto("monto"),
  validarFechaNoFutura("fecha"),
  body("descripcion").trim().isLength({ min: 3, max: 500 }),
  body("rubro").trim().isLength({ min: 2, max: 80 }),
  validar,
], controlador.crear);
router.patch("/:id/revision", permitirGrupo("REVISION_RENDICIONES"), [param("id").isMongoId(), body("accion").isIn(["aprobar", "observar"]), body("observacion").optional().isLength({ max: 1000 }), validar], controlador.revisar);

export default router;
