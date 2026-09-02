const gastoRepository = require("../repositories/GastoRepository");
const proyectoService = require("../services/ProyectoService");
const Gasto = require("../models/Gasto");
const ApiError = require("../utils/ApiError");
const httpStatus = require("../utils/httpStatus");
const asyncHandler = require("../utils/asyncHandler");

const listar = asyncHandler((req, res) => {
  const { proyectoId } = req.query;
  const gastos = proyectoId
    ? gastoRepository.findByProyecto(proyectoId)
    : gastoRepository.findAll();
  res.status(httpStatus.OK).json(gastos);
});

const obtenerPorId = asyncHandler((req, res) => {
  const gasto = gastoRepository.findById(req.params.id);
  if (!gasto) {
    throw ApiError.notFound(`No existe un gasto con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(gasto);
});

const crear = asyncHandler((req, res) => {
  const nuevoGasto = new Gasto(req.body);
  proyectoService.obtenerProyectoOFallar(nuevoGasto.proyectoId);
  proyectoService.validarGastoContraSaldo(nuevoGasto.proyectoId, nuevoGasto.monto);

  const creado = gastoRepository.create(nuevoGasto);
  proyectoService.marcarDonacionesUtilizadas(nuevoGasto.proyectoId, nuevoGasto.monto);

  res.status(httpStatus.CREATED).json(creado);
});

module.exports = { listar, obtenerPorId, crear };
