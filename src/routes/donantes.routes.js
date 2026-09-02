const express = require("express");
const router = express.Router();
const controlador = require("../controllers/donantesController");

router.get("/", controlador.listar);
router.get("/:id", controlador.obtenerPorId);
router.post("/", controlador.crear);
router.put("/:id", controlador.actualizar);
router.delete("/:id", controlador.eliminar);

module.exports = router;
