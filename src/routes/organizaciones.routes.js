import express from "express";
import { body, param } from "express-validator";
import * as c from "../controllers/organizacionesController.js";
import { permitirGrupo } from "../middleware/auth.js";
import { validar } from "../middleware/validate.js";

const r = express.Router();
const idValido = [param("id").isMongoId(), validar];

r.get("/", permitirGrupo("LECTURA_ORGANIZACIONES"), c.listar);
r.get("/:id", permitirGrupo("LECTURA_ORGANIZACIONES"), idValido, c.obtenerPorId);

const campos = [body("nombre").trim().isLength({ min: 2, max: 120 }), body("descripcion").trim().isLength({ min: 10, max: 1000 }), validar];

r.post("/", permitirGrupo("GESTION_ORGANIZACIONES"), campos, c.crear);
r.put("/:id", permitirGrupo("GESTION_ORGANIZACIONES"), [param("id").isMongoId(), ...campos], c.actualizar);
r.delete("/:id", permitirGrupo("BAJA_REGISTROS"), idValido, c.eliminar);

export default r;
