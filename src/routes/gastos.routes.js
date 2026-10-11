import express from "express";
import * as controlador from "../controllers/gastosController.js";

const router = express.Router();

router.get("/", controlador.listar);
router.get("/:id", controlador.obtenerPorId);
router.post("/", controlador.crear);

export default router;
