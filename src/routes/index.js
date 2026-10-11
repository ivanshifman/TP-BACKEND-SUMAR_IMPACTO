import express from "express";
import donantesRoutes from "./donantes.routes.js";
import organizacionesRoutes from "./organizaciones.routes.js";
import proyectosRoutes from "./proyectos.routes.js";
import donacionesRoutes from "./donaciones.routes.js";
import gastosRoutes from "./gastos.routes.js";

const router = express.Router();

router.use("/donantes", donantesRoutes);
router.use("/organizaciones", organizacionesRoutes);
router.use("/proyectos", proyectosRoutes);
router.use("/donaciones", donacionesRoutes);
router.use("/gastos", gastosRoutes);

export default router;
