const organizacionRepository = require("../repositories/OrganizacionRepository");
const Organizacion = require("../models/Organizacion");
const ApiError = require("../utils/ApiError");
const httpStatus = require("../utils/httpStatus");
const asyncHandler = require("../utils/asyncHandler");

const listar = asyncHandler((req, res) => {
  res.status(httpStatus.OK).json(organizacionRepository.findAll());
});

const obtenerPorId = asyncHandler((req, res) => {
  const organizacion = organizacionRepository.findById(req.params.id);
  if (!organizacion) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(organizacion);
});

const crear = asyncHandler((req, res) => {
  const nuevaOrganizacion = new Organizacion(req.body);
  const creada = organizacionRepository.create(nuevaOrganizacion);
  res.status(httpStatus.CREATED).json(creada);
});

const actualizar = asyncHandler((req, res) => {
  const existente = organizacionRepository.findById(req.params.id);
  if (!existente) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  const datosValidados = new Organizacion({ ...existente, ...req.body });
  const actualizada = organizacionRepository.update(req.params.id, datosValidados);
  res.status(httpStatus.OK).json(actualizada);
});

const eliminar = asyncHandler((req, res) => {
  const eliminada = organizacionRepository.delete(req.params.id);
  if (!eliminada) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
