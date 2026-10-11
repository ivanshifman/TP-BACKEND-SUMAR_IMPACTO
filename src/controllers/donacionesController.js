import Donacion from "../models/Donacion.js";
import donacionService from "../services/DonacionService.js";
import ApiError from "../utils/ApiError.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req, res) => {
  const { donanteId, proyectoId } = req.query;
  const filtro = {};
  if (donanteId) filtro.donante = donanteId;
  if (proyectoId) filtro.proyecto = proyectoId;
  const donaciones = await Donacion.find(filtro)
    .populate("donante", "nombre tipo")
    .populate("proyecto", "nombre")
    .sort({ fecha: -1 });
  res.status(httpStatus.OK).json(donaciones);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const donacion = await Donacion.findById(req.params.id)
    .populate("donante", "nombre tipo")
    .populate("proyecto", "nombre");
  if (!donacion) {
    throw ApiError.notFound(`No existe una donación con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(donacion);
});

export const crear = asyncHandler(async (req, res) => {
  await donacionService.validarDonanteExiste(req.body.donante);
  await donacionService.validarProyectoExisteSiCorresponde(req.body.proyecto);
  const creada = await Donacion.create(req.body);
  res.status(httpStatus.CREATED).json(creada);
});

export const actualizar = asyncHandler(async (req, res) => {
  await donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  if (req.body.donante) await donacionService.validarDonanteExiste(req.body.donante);
  if (req.body.proyecto) await donacionService.validarProyectoExisteSiCorresponde(req.body.proyecto);

  const { utilizada, ...datosPermitidos } = req.body;

  const actualizada = await Donacion.findByIdAndUpdate(req.params.id, datosPermitidos, {
    new: true,
    runValidators: true,
    context: "query",
  });
  res.status(httpStatus.OK).json(actualizada);
});


export const eliminar = asyncHandler(async (req, res) => {
  await donacionService.validarNoUtilizadaAntesDeModificar(req.params.id);
  await Donacion.findByIdAndDelete(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

export default { listar, obtenerPorId, crear, actualizar, eliminar };
