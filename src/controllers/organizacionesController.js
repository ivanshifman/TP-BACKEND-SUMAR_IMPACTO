import Organizacion from "../models/Organizacion.js";
import ApiError from "../utils/ApiError.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req, res) => {
  const organizaciones = await Organizacion.find().sort({ nombre: 1 });
  res.status(httpStatus.OK).json(organizaciones);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const organizacion = await Organizacion.findById(req.params.id);
  if (!organizacion) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(organizacion);
});

export const crear = asyncHandler(async (req, res) => {
  const nuevaOrganizacion = await Organizacion.create(req.body);
  res.status(httpStatus.CREATED).json(nuevaOrganizacion);
});

export const actualizar = asyncHandler(async (req, res) => {
  const actualizada = await Organizacion.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: "query",
  });
  if (!actualizada) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(actualizada);
});

export const eliminar = asyncHandler(async (req, res) => {
  const eliminada = await Organizacion.findByIdAndDelete(req.params.id);
  if (!eliminada) {
    throw ApiError.notFound(`No existe una organización con id ${req.params.id}.`);
  }
  res.status(httpStatus.NO_CONTENT).send();
});

export default { listar, obtenerPorId, crear, actualizar, eliminar };
