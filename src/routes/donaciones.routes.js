import express from "express";
import { body, param, query } from "express-validator";
import * as c from "../controllers/donacionesController.js";
import { permitirGrupo } from "../middleware/auth.js";
import { validar } from "../middleware/validate.js";
import { validarMonto, validarFechaNoFutura } from "../utils/validadores.js";

const r = express.Router();
const idValido = [param("id").isMongoId(), validar];

r.get("/", permitirGrupo("LECTURA_FINANCIERA"), [query("donanteId").optional().isMongoId(), query("proyectoId").optional().isMongoId(), validar], c.listar);
r.get("/:id", permitirGrupo("LECTURA_FINANCIERA"), idValido, c.obtenerPorId);

const campos = [
  body("donante").isMongoId(),
  body("proyecto").optional({ values: "falsy" }).isMongoId(),
  body("campania").optional({ values: "falsy" }).isMongoId(),
  validarMonto("monto"),
  validarFechaNoFutura("fecha", { opcional: true }),
  validar,
];

r.post("/", permitirGrupo("GESTION_FINANCIERA"), campos, c.crear);
r.put("/:id", permitirGrupo("GESTION_FINANCIERA"), [param("id").isMongoId(), ...campos], c.actualizar);
r.delete("/:id", permitirGrupo("BAJA_REGISTROS"), idValido, c.eliminar);

export default r;
