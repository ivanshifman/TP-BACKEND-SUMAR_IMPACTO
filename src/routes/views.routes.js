const express = require("express");
const router = express.Router();
const controlador = require("../controllers/viewsController");

router.get("/", controlador.inicio);
router.get("/proyectos/:id", controlador.detalleProyecto);
router.get("/donantes", controlador.listarDonantes);
router.get("/donantes/:id", controlador.detalleDonante);
router.get("/organizaciones", controlador.listarOrganizaciones);
router.get("/organizaciones/:id", controlador.detalleOrganizacion);
router.get("/gastos", controlador.listarGastos);

module.exports = router;