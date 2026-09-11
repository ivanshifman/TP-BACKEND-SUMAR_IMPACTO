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

const listarDonantes = asyncHandler((req, res) => {
  const donaciones = donacionRepository.findAll();
  const donantes = donanteRepository.findAll().map((donante) => {
    const propias = donaciones.filter((d) => d.donanteId === donante.id);
    const totalDonado = propias.reduce((acc, d) => acc + d.monto, 0);
    return { ...donante, cantidadDonaciones: propias.length, totalDonado };
  });

  res.render("donantes/lista", { titulo: "SumarImpacto - Donantes", donantes });
});

const detalleDonante = asyncHandler((req, res) => {
  const donante = donanteRepository.findById(req.params.id);
  if (!donante) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  const proyectos = proyectoRepository.findAll();
  const donaciones = donacionRepository.findByDonante(donante.id).map((donacion) => {
    const proyecto = proyectos.find((p) => p.id === donacion.proyectoId);
    return { ...donacion, proyectoNombre: proyecto ? proyecto.nombre : "Sin proyecto asignado" };
  });
  const totalDonado = donaciones.reduce((acc, d) => acc + d.monto, 0);

  res.render("donantes/detalle", {
    titulo: `SumarImpacto - ${donante.nombre}`,
    donante,
    donaciones,
    totalDonado,
  });
});

const listarOrganizaciones = asyncHandler((req, res) => {
  const proyectos = proyectoRepository.findAll();
  const organizaciones = organizacionRepository.findAll().map((organizacion) => ({
    ...organizacion,
    cantidadProyectos: proyectos.filter((p) => p.organizacionId === organizacion.id).length,
  }));

  res.render("organizaciones/lista", { titulo: "SumarImpacto - Organizaciones", organizaciones });
});

const detalleOrganizacion = asyncHandler((req, res) => {
  const organizacion = organizacionRepository.findById(req.params.id);
  if (!organizacion) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  const proyectos = proyectoRepository.findByOrganizacion(organizacion.id).map((proyecto) => {
    const { saldoDisponible } = proyectoService.calcularSaldoDisponible(proyecto.id);
    return { ...proyecto, saldoDisponible };
  });

  res.render("organizaciones/detalle", {
    titulo: `SumarImpacto - ${organizacion.nombre}`,
    organizacion,
    proyectos,
  });
});

const listarGastos = asyncHandler((req, res) => {
  const proyectos = proyectoRepository.findAll();
  const gastos = gastoRepository.findAll().map((gasto) => {
    const proyecto = proyectos.find((p) => p.id === gasto.proyectoId);
    return { ...gasto, proyectoNombre: proyecto ? proyecto.nombre : "Proyecto no encontrado" };
  });

  res.render("gastos/lista", { titulo: "SumarImpacto - Gastos", gastos });
});

module.exports = {
  inicio,
  detalleProyecto,
  listarDonantes,
  detalleDonante,
  listarOrganizaciones,
  detalleOrganizacion,
  listarGastos,
};