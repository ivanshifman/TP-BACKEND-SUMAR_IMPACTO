import express from "express";
import * as controlador from "../controllers/viewsController.js";

const router = express.Router();

router.get("/", controlador.inicio);
router.get("/proyectos/nuevo", controlador.mostrarFormularioNuevoProyecto);
router.post("/proyectos", controlador.crearProyectoDesdeFormulario);
router.get("/proyectos/:id/editar", controlador.mostrarFormularioEditarProyecto);
router.put("/proyectos/:id", controlador.actualizarProyectoDesdeFormulario);
router.delete("/proyectos/:id", controlador.eliminarProyectoDesdeFormulario);
router.get("/proyectos/:id", controlador.detalleProyecto);

router.get("/donantes", controlador.listarDonantes);
router.get("/donantes/nuevo", controlador.mostrarFormularioNuevoDonante);
router.post("/donantes", controlador.crearDonanteDesdeFormulario);
router.get("/donantes/:id/editar", controlador.mostrarFormularioEditarDonante);
router.put("/donantes/:id", controlador.actualizarDonanteDesdeFormulario);
router.delete("/donantes/:id", controlador.eliminarDonanteDesdeFormulario);
router.get("/donantes/:id", controlador.detalleDonante);

router.get("/organizaciones", controlador.listarOrganizaciones);
router.get("/organizaciones/nuevo", controlador.mostrarFormularioNuevaOrganizacion);
router.post("/organizaciones", controlador.crearOrganizacionDesdeFormulario);
router.get("/organizaciones/:id/editar", controlador.mostrarFormularioEditarOrganizacion);
router.put("/organizaciones/:id", controlador.actualizarOrganizacionDesdeFormulario);
router.delete("/organizaciones/:id", controlador.eliminarOrganizacionDesdeFormulario);
router.get("/organizaciones/:id", controlador.detalleOrganizacion);

router.get("/donaciones/nueva", controlador.mostrarFormularioNuevaDonacion);
router.post("/donaciones", controlador.crearDonacionDesdeFormulario);
router.get("/donaciones/:id/editar", controlador.mostrarFormularioEditarDonacion);
router.put("/donaciones/:id", controlador.actualizarDonacionDesdeFormulario);
router.delete("/donaciones/:id", controlador.eliminarDonacionDesdeFormulario);

router.get("/gastos", controlador.listarGastos);
router.get("/gastos/nuevo", controlador.mostrarFormularioNuevoGasto);
router.post("/gastos", controlador.crearGastoDesdeFormulario);

export default router;
