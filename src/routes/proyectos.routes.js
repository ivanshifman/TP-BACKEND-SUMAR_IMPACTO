import express from "express";
import * as controlador from "../controllers/proyectosController.js";

const router = express.Router();

router.get("/:id/saldo", controlador.saldo);
router.get("/:id/donaciones", controlador.donaciones);
router.get("/:id/gastos", controlador.gastos);

router.get("/", controlador.listar);
router.get("/:id", controlador.obtenerPorId);
router.post("/", controlador.crear);
router.put("/:id", controlador.actualizar);
router.delete("/:id", controlador.eliminar);

export default router;
