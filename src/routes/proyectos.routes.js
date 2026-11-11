import express from "express";
import { body, param, query } from "express-validator";
import * as c from "../controllers/proyectosController.js";
import { permitirGrupo } from "../middleware/auth.js";
import { validar } from "../middleware/validate.js";
import { validarMonto } from "../utils/validadores.js";

const r = express.Router();
const idValido = [param("id").isMongoId(), validar];

r.get("/:id/saldo", idValido, c.saldo);
r.get("/:id/donaciones", permitirGrupo("LECTURA_FINANCIERA"), idValido, c.donaciones);
r.get("/:id/gastos", permitirGrupo("LECTURA_RENDICIONES"), idValido, c.gastos);
r.get("/", [query("organizacionId").optional().isMongoId(), validar], c.listar);
r.get("/:id", idValido, c.obtenerPorId);

const campos = [
  body("nombre").trim().isLength({ min: 2, max: 120 }),
  body("organizacion").isMongoId(),
  validarMonto("presupuestoTotal"),
  body("periodoInicio").isISO8601(),
  body("periodoFin").isISO8601().bail()
    .custom((fin, { req }) => new Date(fin) >= new Date(req.body.periodoInicio)).withMessage("El período de fin no puede ser anterior al de inicio."),
  body("rubros").isArray({ min: 1 }),
  body("rubros.*.nombre").trim().isLength({ min: 2, max: 80 }),
  validarMonto("rubros.*.montoAprobado"),
  validar,
];

r.post("/", permitirGrupo("GESTION_PROYECTOS"), campos, c.crear);
r.put("/:id", permitirGrupo("GESTION_PROYECTOS"), [param("id").isMongoId(), ...campos], c.actualizar);
r.patch("/:id/estado", permitirGrupo("GESTION_PROYECTOS"), [param("id").isMongoId(), body("activo").isBoolean({ strict: true }).withMessage("«activo» debe ser verdadero o falso."), validar], c.cambiarEstado);
r.delete("/:id", permitirGrupo("BAJA_PROYECTOS"), idValido, c.eliminar);

export default r;
