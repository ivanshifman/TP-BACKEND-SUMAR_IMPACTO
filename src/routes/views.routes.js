const express = require("express");
const router = express.Router();
const controlador = require("../controllers/viewsController");

router.get("/", controlador.inicio);
router.get("/proyectos/:id", controlador.detalleProyecto);

module.exports = router;
