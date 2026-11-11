import Donacion from "../models/Donacion.js";
import donacionService from "../services/DonacionService.js";
import ApiError from "../utils/ApiError.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";

// Lista cerrada de campos aceptados del cuerpo de la solicitud.
const datosDelCuerpo = (body) => ({ donante: body.donante, proyecto: body.proyecto, campania: body.campania, monto: body.monto, fecha: body.fecha });

export const listar = asyncHandler(async (req, res) => {
  const { donanteId, proyectoId } = req.query;
  const filtro = {};
  if (donanteId) filtro.donante = donanteId;
  if (proyectoId) filtro.proyecto = proyectoId;
  const donaciones = await Donacion.find(filtro)
    .populate("donante", "nombre tipo")
    .populate("proyecto", "nombre").populate("campania", "nombre")
    .sort({ fecha: -1 });
  res.status(httpStatus.OK).json(donaciones);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const donacion = await Donacion.findById(req.params.id)
    .populate("donante", "nombre tipo")
    .populate("proyecto", "nombre").populate("campania", "nombre");
  if (!donacion) {
    throw ApiError.notFound(`No existe una donación con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(donacion);
});

export const crear = asyncHandler(async (req, res) => {
  const creada = await donacionService.crear(datosDelCuerpo(req.body));
  res.status(httpStatus.CREATED).json(creada);
});

export const actualizar = asyncHandler(async (req, res) => {
  const actualizada = await donacionService.actualizar(req.params.id, datosDelCuerpo(req.body));
  res.status(httpStatus.OK).json(actualizada);
});

export const eliminar = asyncHandler(async (req, res) => {
  await donacionService.eliminar(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

export default { listar, obtenerPorId, crear, actualizar, eliminar };
