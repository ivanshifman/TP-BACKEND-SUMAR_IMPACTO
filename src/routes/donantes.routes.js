import express from "express";
import { body, param, query } from "express-validator";
import * as c from "../controllers/donantesController.js";
import { permitirGrupo } from "../middleware/auth.js";
import { validar } from "../middleware/validate.js";
import { validarEmail } from "../utils/validadores.js";

const r = express.Router();
const idValido = [param("id").isMongoId(), validar];

r.get("/", permitirGrupo("LECTURA_FINANCIERA"), [query("tipo").optional().isIn(["individual", "corporativo"]), validar], c.listar);
r.get("/:id", permitirGrupo("LECTURA_FINANCIERA"), idValido, c.obtenerPorId);

const campos = [body("nombre").trim().isLength({ min: 2, max: 120 }), validarEmail(), body("tipo").isIn(["individual", "corporativo"]), validar];

r.post("/", permitirGrupo("GESTION_FINANCIERA"), campos, c.crear);
r.put("/:id", permitirGrupo("GESTION_FINANCIERA"), [param("id").isMongoId(), ...campos], c.actualizar);
r.delete("/:id", permitirGrupo("BAJA_REGISTROS"), idValido, c.eliminar);

export default r;
