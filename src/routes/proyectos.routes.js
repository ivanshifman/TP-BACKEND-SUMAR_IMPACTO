const express = require("express");
const router = express.Router();
const controlador = require("../controllers/proyectosController");

router.get("/:id/saldo", controlador.saldo);
router.get("/:id/donaciones", controlador.donaciones);
router.get("/:id/gastos", controlador.gastos);

router.get("/", controlador.listar);
router.get("/:id", controlador.obtenerPorId);
router.post("/", controlador.crear);
router.put("/:id", controlador.actualizar);
router.delete("/:id", controlador.eliminar);

module.exports = router;
