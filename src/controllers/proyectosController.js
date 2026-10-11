import Proyecto from "../models/Proyecto.js";
import Donacion from "../models/Donacion.js";
import Gasto from "../models/Gasto.js";
import proyectoService from "../services/ProyectoService.js";
import httpStatus from "../utils/httpStatus.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listar = asyncHandler(async (req, res) => {
  const { organizacionId } = req.query;
  const filtro = organizacionId ? { organizacion: organizacionId } : {};
  const proyectos = await Proyecto.find(filtro).populate("organizacion", "nombre").sort({ nombre: 1 });
  res.status(httpStatus.OK).json(proyectos);
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.obtenerProyectoOFallar(req.params.id);
  res.status(httpStatus.OK).json(proyecto);
});

export const crear = asyncHandler(async (req, res) => {
  await proyectoService.validarOrganizacionExiste(req.body.organizacion);
  const creado = await Proyecto.create(req.body);
  res.status(httpStatus.CREATED).json(creado);
});

export const actualizar = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  if (req.body.organizacion) {
    await proyectoService.validarOrganizacionExiste(req.body.organizacion);
  }
  const actualizado = await Proyecto.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    context: "query",
  });
  res.status(httpStatus.OK).json(actualizado);
});

export const eliminar = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  await Proyecto.findByIdAndDelete(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

export const saldo = asyncHandler(async (req, res) => {
  const resultado = await proyectoService.calcularSaldoDisponible(req.params.id);
  res.status(httpStatus.OK).json(resultado);
});

export const donaciones = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  const resultado = await Donacion.find({ proyecto: req.params.id })
    .populate("donante", "nombre tipo")
    .sort({ fecha: 1 });
  res.status(httpStatus.OK).json(resultado);
});

export const gastos = asyncHandler(async (req, res) => {
  await proyectoService.obtenerProyectoOFallar(req.params.id);
  const resultado = await Gasto.find({ proyecto: req.params.id }).sort({ fecha: 1 });
  res.status(httpStatus.OK).json(resultado);
});

export default { listar, obtenerPorId, crear, actualizar, eliminar, saldo, donaciones, gastos };
