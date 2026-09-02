const proyectoRepository = require("../repositories/ProyectoRepository");
const organizacionRepository = require("../repositories/OrganizacionRepository");
const donanteRepository = require("../repositories/DonanteRepository");
const donacionRepository = require("../repositories/DonacionRepository");
const gastoRepository = require("../repositories/GastoRepository");
const proyectoService = require("../services/ProyectoService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const inicio = asyncHandler((req, res) => {
  const organizaciones = organizacionRepository.findAll();
  const proyectos = proyectoRepository.findAll().map((proyecto) => {
    const organizacion = organizaciones.find((o) => o.id === proyecto.organizacionId);
    const { totalDonado, totalGastado, saldoDisponible } = proyectoService.calcularSaldoDisponible(proyecto.id);
    return {
      ...proyecto,
      organizacionNombre: organizacion ? organizacion.nombre : "Organización no encontrada",
      totalDonado,
      totalGastado,
      saldoDisponible,
    };
  });

  res.render("index", { titulo: "SumarImpacto - Proyectos", proyectos });
});

const detalleProyecto = asyncHandler((req, res) => {
  const proyecto = proyectoRepository.findById(req.params.id);
  if (!proyecto) {
    throw ApiError.notFound(`No existe un proyecto con id ${req.params.id}.`);
  }
  const organizacion = organizacionRepository.findById(proyecto.organizacionId);
  const donantes = donanteRepository.findAll();

  const donaciones = donacionRepository.findByProyecto(proyecto.id).map((donacion) => {
    const donante = donantes.find((d) => d.id === donacion.donanteId);
    return { ...donacion, donanteNombre: donante ? donante.nombre : "Donante no encontrado" };
  });
  const gastos = gastoRepository.findByProyecto(proyecto.id);
  const { totalDonado, totalGastado, saldoDisponible } = proyectoService.calcularSaldoDisponible(proyecto.id);

  res.render("proyectos/detalle", {
    titulo: `SumarImpacto - ${proyecto.nombre}`,
    proyecto,
    organizacion,
    donaciones,
    gastos,
    totalDonado,
    totalGastado,
    saldoDisponible,
  });
});

module.exports = { inicio, detalleProyecto };
