const donanteRepository = require("../repositories/DonanteRepository");
const Donante = require("../models/Donante");
const ApiError = require("../utils/ApiError");
const httpStatus = require("../utils/httpStatus");
const asyncHandler = require("../utils/asyncHandler");

const listar = asyncHandler((req, res) => {
  const { tipo } = req.query;
  let donantes = donanteRepository.findAll();
  if (tipo) {
    donantes = donantes.filter((d) => d.tipo === tipo);
  }
  res.status(httpStatus.OK).json(donantes);
});

const obtenerPorId = asyncHandler((req, res) => {
  const donante = donanteRepository.findById(req.params.id);
  if (!donante) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(donante);
});

const crear = asyncHandler((req, res) => {
  const nuevoDonante = new Donante(req.body);
  const donanteCreado = donanteRepository.create(nuevoDonante);
  res.status(httpStatus.CREATED).json(donanteCreado);
});

const actualizar = asyncHandler((req, res) => {
  const existente = donanteRepository.findById(req.params.id);
  if (!existente) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  const datosValidados = new Donante({ ...existente, ...req.body });
  const actualizado = donanteRepository.update(req.params.id, datosValidados);
  res.status(httpStatus.OK).json(actualizado);
});

const eliminar = asyncHandler((req, res) => {
  const eliminado = donanteRepository.delete(req.params.id);
  if (!eliminado) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
