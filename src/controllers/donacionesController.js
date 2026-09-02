const donacionRepository = require("../repositories/DonacionRepository");
const donacionService = require("../services/DonacionService");
const Donacion = require("../models/Donacion");
const ApiError = require("../utils/ApiError");
const httpStatus = require("../utils/httpStatus");
const asyncHandler = require("../utils/asyncHandler");

const listar = asyncHandler((req, res) => {
  const { donanteId, proyectoId } = req.query;
  let donaciones = donacionRepository.findAll();
  if (donanteId) donaciones = donaciones.filter((d) => d.donanteId === Number(donanteId));
  if (proyectoId) donaciones = donaciones.filter((d) => d.proyectoId === Number(proyectoId));
  res.status(httpStatus.OK).json(donaciones);
});

const obtenerPorId = asyncHandler((req, res) => {
  const donacion = donacionRepository.findById(req.params.id);
  if (!donacion) {
    throw ApiError.notFound(`No existe una donación con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(donacion);
});

const crear = asyncHandler((req, res) => {
  const nuevaDonacion = new Donacion(req.body);
  donacionService.validarDonanteExiste(nuevaDonacion.donanteId);
  donacionService.validarProyectoExisteSiCorresponde(nuevaDonacion.proyectoId);
  const creada = donacionRepository.create(nuevaDonacion);
  res.status(httpStatus.CREATED).json(creada);
});

const actualizar = asyncHandler((req, res) => {
  const existente = donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  const datosValidados = new Donacion({ ...existente, ...req.body });
  donacionService.validarDonanteExiste(datosValidados.donanteId);
  donacionService.validarProyectoExisteSiCorresponde(datosValidados.proyectoId);
  datosValidados.utilizada = existente.utilizada;
  const actualizada = donacionRepository.update(req.params.id, datosValidados);
  res.status(httpStatus.OK).json(actualizada);
});

const eliminar = asyncHandler((req, res) => {
  donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  donacionRepository.delete(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
