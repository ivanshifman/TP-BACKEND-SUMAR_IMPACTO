const express = require("express");
const router = express.Router();

router.use("/donantes", require("./donantes.routes"));
router.use("/organizaciones", require("./organizaciones.routes"));
router.use("/proyectos", require("./proyectos.routes"));
router.use("/donaciones", require("./donaciones.routes"));
router.use("/gastos", require("./gastos.routes"));

module.exports = router;
