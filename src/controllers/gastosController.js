import Gasto from "../models/Gasto.js";
import proyectoService from "../services/ProyectoService.js";
import ApiError from "../utils/ApiError.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req, res) => {
  const { proyectoId } = req.query;
  const filtro = proyectoId ? { proyecto: proyectoId } : {};
  const gastos = await Gasto.find(filtro).populate("proyecto", "nombre").sort({ fecha: -1 });
  res.status(httpStatus.OK).json(gastos);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const gasto = await Gasto.findById(req.params.id).populate("proyecto", "nombre");
  if (!gasto) {
    throw ApiError.notFound(`No existe un gasto con id ${req.params.id}.`);
  }
  res.status(httpStatus.OK).json(gasto);
});

export const crear = asyncHandler(async (req, res) => {
  const { proyecto: proyectoId, monto } = req.body;
  await proyectoService.obtenerProyectoOFallar(proyectoId);
  await proyectoService.validarGastoContraSaldo(proyectoId, Number(monto));

  const creado = await Gasto.create(req.body);
  await proyectoService.marcarDonacionesUtilizadas(proyectoId, Number(monto));

  res.status(httpStatus.CREATED).json(creado);
});

export default { listar, obtenerPorId, crear };
