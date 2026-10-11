import express from "express";
import * as controlador from "../controllers/donantesController.js";

const router = express.Router();

router.get("/", controlador.listar);
router.get("/:id", controlador.obtenerPorId);
router.post("/", controlador.crear);
router.put("/:id", controlador.actualizar);
router.delete("/:id", controlador.eliminar);

export default router;
