const proyectoRepository = require("../repositories/ProyectoRepository");
const donacionRepository = require("../repositories/DonacionRepository");
const gastoRepository = require("../repositories/GastoRepository");
const proyectoService = require("../services/ProyectoService");
const Proyecto = require("../models/Proyecto");
const httpStatus = require("../utils/httpStatus");
const asyncHandler = require("../utils/asyncHandler");

const listar = asyncHandler((req, res) => {
  const { organizacionId } = req.query;
  const proyectos = organizacionId
    ? proyectoRepository.findByOrganizacion(organizacionId)
    : proyectoRepository.findAll();
  res.status(httpStatus.OK).json(proyectos);
});

const obtenerPorId = asyncHandler((req, res) => {
  const proyecto = proyectoService.obtenerProyectoOFallar(req.params.id);
  res.status(httpStatus.OK).json(proyecto);
});

const crear = asyncHandler((req, res) => {
  const nuevoProyecto = new Proyecto(req.body);
  proyectoService.validarOrganizacionExiste(nuevoProyecto.organizacionId);
  const creado = proyectoRepository.create(nuevoProyecto);
  res.status(httpStatus.CREATED).json(creado);
});

const actualizar = asyncHandler((req, res) => {
  const existente = proyectoService.obtenerProyectoOFallar(req.params.id);
  const datosValidados = new Proyecto({ ...existente, ...req.body });
  proyectoService.validarOrganizacionExiste(datosValidados.organizacionId);
  const actualizado = proyectoRepository.update(req.params.id, datosValidados);
  res.status(httpStatus.OK).json(actualizado);
});

const eliminar = asyncHandler((req, res) => {
  proyectoService.obtenerProyectoOFallar(req.params.id);
  proyectoRepository.delete(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const saldo = asyncHandler((req, res) => {
  const resultado = proyectoService.calcularSaldoDisponible(req.params.id);
  res.status(httpStatus.OK).json(resultado);
});

const donaciones = asyncHandler((req, res) => {
  proyectoService.obtenerProyectoOFallar(req.params.id);
  res.status(httpStatus.OK).json(donacionRepository.findByProyecto(req.params.id));
});

const gastos = asyncHandler((req, res) => {
  proyectoService.obtenerProyectoOFallar(req.params.id);
  res.status(httpStatus.OK).json(gastoRepository.findByProyecto(req.params.id));
});

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar, saldo, donaciones, gastos };
