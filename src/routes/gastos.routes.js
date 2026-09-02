const express = require("express");
const router = express.Router();
const controlador = require("../controllers/gastosController");

router.get("/", controlador.listar);
router.get("/:id", controlador.obtenerPorId);
router.post("/", controlador.crear);

module.exports = router;
