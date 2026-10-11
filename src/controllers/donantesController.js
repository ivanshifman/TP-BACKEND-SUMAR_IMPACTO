import Donante from "../models/Donante.js";
import ApiError from "../utils/ApiError.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req, res) => {
  const { tipo } = req.query;
  const filtro = tipo ? { tipo } : {};
  const donantes = await Donante.find(filtro).sort({ nombre: 1 });
  res.status(httpStatus.OK).json(donantes);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const donante = await Donante.findById(req.params.id);
  if (!donante) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(donante);
});

export const crear = asyncHandler(async (req, res) => {
  const nuevoDonante = await Donante.create(req.body);
  res.status(httpStatus.CREATED).json(nuevoDonante);
});

export const actualizar = asyncHandler(async (req, res) => {
  const actualizado = await Donante.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: "query",
  });
  if (!actualizado) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(actualizado);
});

export const eliminar = asyncHandler(async (req, res) => {
  const eliminado = await Donante.findByIdAndDelete(req.params.id);
  if (!eliminado) {
    throw ApiError.notFound(`No existe un donante con id ${req.params.id}.`);
  }
  res.status(httpStatus.NO_CONTENT).send();
});

export default { listar, obtenerPorId, crear, actualizar, eliminar };
